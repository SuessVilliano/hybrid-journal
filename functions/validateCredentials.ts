import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { provider, apiKey, apiSecret, server, accountNumber } = await req.json();

        if (!provider || !apiKey) {
            return Response.json({ 
                error: 'Missing provider or credentials' 
            }, { status: 400 });
        }

        // Validation logic per provider
        let validationResult = { valid: false, message: '', details: null };

        try {
            switch (provider) {
                case 'Alpaca':
                    // Validate Alpaca API
                    const alpacaUrl = server || 'https://paper-api.alpaca.markets';
                    const alpacaResponse = await fetch(`${alpacaUrl}/v2/account`, {
                        headers: {
                            'APCA-API-KEY-ID': apiKey,
                            'APCA-API-SECRET-KEY': apiSecret
                        }
                    });

                    if (alpacaResponse.ok) {
                        const accountData = await alpacaResponse.json();
                        validationResult = {
                            valid: true,
                            message: 'Credentials validated successfully!',
                            details: {
                                accountNumber: accountData.account_number,
                                status: accountData.status,
                                balance: accountData.cash
                            }
                        };
                    } else {
                        const error = await alpacaResponse.json();
                        validationResult = {
                            valid: false,
                            message: error.message || 'Invalid credentials'
                        };
                    }
                    break;

                case 'OANDA':
                    // Validate OANDA API
                    const oandaUrl = server || 'https://api-fxpractice.oanda.com';
                    const oandaResponse = await fetch(`${oandaUrl}/v3/accounts/${accountNumber}`, {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (oandaResponse.ok) {
                        const accountData = await oandaResponse.json();
                        validationResult = {
                            valid: true,
                            message: 'OANDA credentials validated!',
                            details: {
                                currency: accountData.account?.currency,
                                balance: accountData.account?.balance
                            }
                        };
                    } else {
                        validationResult = {
                            valid: false,
                            message: 'Invalid OANDA token or account ID'
                        };
                    }
                    break;

                case 'Binance':
                    // Validate Binance API
                    const timestamp = Date.now();
                    const queryString = `timestamp=${timestamp}`;
                    
                    const encoder = new TextEncoder();
                    const keyData = encoder.encode(apiSecret);
                    const messageData = encoder.encode(queryString);

                    const key = await crypto.subtle.importKey(
                        'raw',
                        keyData,
                        { name: 'HMAC', hash: 'SHA-256' },
                        false,
                        ['sign']
                    );

                    const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
                    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
                    const binanceSignature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

                    const binanceUrl = server || 'https://api.binance.com';
                    const binanceResponse = await fetch(`${binanceUrl}/api/v3/account?${queryString}&signature=${binanceSignature}`, {
                        headers: {
                            'X-MBX-APIKEY': apiKey
                        }
                    });

                    if (binanceResponse.ok) {
                        const accountData = await binanceResponse.json();
                        validationResult = {
                            valid: true,
                            message: 'Binance API validated!',
                            details: {
                                canTrade: accountData.canTrade,
                                permissions: accountData.permissions
                            }
                        };
                    } else {
                        const error = await binanceResponse.json();
                        validationResult = {
                            valid: false,
                            message: error.msg || 'Invalid Binance credentials'
                        };
                    }
                    break;

                default:
                    // For other providers, do basic format validation
                    validationResult = {
                        valid: apiKey.length >= 10 && (!apiSecret || apiSecret.length >= 10),
                        message: apiKey.length >= 10 
                            ? 'Credentials format looks valid (full validation on first sync)' 
                            : 'API key seems too short - please verify'
                    };
            }

        } catch (error) {
            validationResult = {
                valid: false,
                message: `Validation error: ${error.message}`,
                details: { error: error.message }
            };
        }

        return Response.json({
            status: validationResult.valid ? 'success' : 'error',
            ...validationResult
        });

    } catch (error) {
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});