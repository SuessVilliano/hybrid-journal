import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * SEC EDGAR Filings Analyzer
 * Fetches 10-K, 10-Q, 8-K filings and uses AI (RAG-style) to extract insights
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ticker, question } = await req.json();
    if (!ticker) return Response.json({ error: 'ticker is required' }, { status: 400 });

    const tickerUpper = ticker.toUpperCase();

    // Step 1: Get CIK from EDGAR company tickers
    const companiesRes = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'User-Agent': 'HybridJournal market-intel@hybridjournal.app' }
    });
    if (!companiesRes.ok) return Response.json({ error: 'Failed to reach SEC EDGAR' }, { status: 502 });

    const companies = await companiesRes.json();
    let cik = null;
    let companyName = null;
    for (const [, company] of Object.entries(companies)) {
      if (company.ticker === tickerUpper) {
        cik = String(company.cik_str).padStart(10, '0');
        companyName = company.title;
        break;
      }
    }
    if (!cik) return Response.json({ error: `No EDGAR data found for ${tickerUpper}` }, { status: 404 });

    // Step 2: Get recent filings list
    const filingsRes = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, {
      headers: { 'User-Agent': 'HybridJournal market-intel@hybridjournal.app' }
    });
    if (!filingsRes.ok) return Response.json({ error: 'Failed to fetch filings' }, { status: 502 });

    const filingsData = await filingsRes.json();
    const recent = filingsData.filings?.recent || {};
    const forms = recent.form || [];
    const dates = recent.filingDate || [];
    const accessionNumbers = recent.accessionNumber || [];
    const primaryDocs = recent.primaryDocument || [];

    // Get most recent 10-K and 10-Q
    const filings = [];
    for (let i = 0; i < forms.length && filings.length < 4; i++) {
      if (['10-K', '10-Q', '8-K'].includes(forms[i])) {
        const acc = accessionNumbers[i].replace(/-/g, '');
        filings.push({
          form: forms[i],
          date: dates[i],
          accessionNumber: accessionNumbers[i],
          url: `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${acc}/${primaryDocs[i]}`,
          indexUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${forms[i]}&dateb=&owner=include&count=1`
        });
      }
    }

    if (filings.length === 0) {
      return Response.json({ error: `No 10-K/10-Q/8-K filings found for ${tickerUpper}` }, { status: 404 });
    }

    // Step 3: Fetch the most recent 10-K or 10-Q text (first 30KB to stay within limits)
    const latestFiling = filings.find(f => f.form === '10-K') || filings[0];
    let filingText = '';
    try {
      const docRes = await fetch(latestFiling.url, {
        headers: { 'User-Agent': 'HybridJournal market-intel@hybridjournal.app' }
      });
      if (docRes.ok) {
        const rawText = await docRes.text();
        // Strip HTML tags and get first 25,000 chars
        filingText = rawText
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .substring(0, 25000);
      }
    } catch (err) {
      console.error('[SEC text fetch]', err.message);
    }

    // Step 4: AI analysis via LLM
    const defaultQuestion = 'Summarize the key risk factors, business highlights, and any material changes from this filing.';
    const userQuestion = question || defaultQuestion;

    const prompt = `You are a financial analyst reading an SEC filing for ${companyName} (${tickerUpper}).

Filing Type: ${latestFiling.form}
Filing Date: ${latestFiling.date}

${filingText ? `FILING CONTENT (first portion):
${filingText}` : `Note: Filing text unavailable. Provide analysis based on your knowledge of ${tickerUpper}.`}

User Question: "${userQuestion}"

Provide a professional, structured analysis answering the question. Include:
1. Direct answer to the question
2. Key risk factors mentioned
3. Any notable changes from previous periods
4. Management's forward-looking statements or guidance
5. Red flags or positive signals for investors/traders

Be specific, cite numbers where visible in the text, and keep it actionable.`;

    const aiAnalysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6'
    });

    return Response.json({
      ticker: tickerUpper,
      company: companyName,
      cik: parseInt(cik),
      filings,
      latestFiling,
      analysis: aiAnalysis,
      question: userQuestion,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[SEC Analyzer Error]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});