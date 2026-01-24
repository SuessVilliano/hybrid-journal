import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { copyParamsId } = await req.json();

        // Get all executed copied trades that need reconciliation
        const copiedTrades = await base44.entities.CopiedTrade.filter({
            copy_params_id: copyParamsId,
            copy_status: 'executed',
            reconciliation_status: 'pending',
            created_by: user.email
        });

        let matched = 0;
        let mismatched = 0;
        let missing = 0;

        for (const copiedTrade of copiedTrades) {
            // Fetch source trade current state
            const sourceTrades = await base44.entities.Trade.filter({
                source_trade_id: copiedTrade.source_trade_id,
                created_by: user.email
            });

            if (sourceTrades.length === 0) {
                // Source trade missing
                await base44.entities.CopiedTrade.update(copiedTrade.id, {
                    reconciliation_status: 'missing',
                    reconciled_at: new Date().toISOString()
                });
                missing++;
                continue;
            }

            const sourceTrade = sourceTrades[0];

            // Fetch target trade (from Trade entity using target_trade_id)
            const targetTrades = await base44.entities.Trade.filter({
                source_trade_id: copiedTrade.target_trade_id,
                created_by: user.email
            });

            if (targetTrades.length === 0) {
                // Target trade not synced yet
                await base44.entities.CopiedTrade.update(copiedTrade.id, {
                    reconciliation_status: 'missing',
                    reconciled_at: new Date().toISOString()
                });
                missing++;
                continue;
            }

            const targetTrade = targetTrades[0];

            // Compare and reconcile
            const pnlDifference = (targetTrade.pnl || 0) - (sourceTrade.pnl || 0);
            const tolerance = 5.0; // $5 tolerance for matching

            const status = Math.abs(pnlDifference) <= tolerance ? 'matched' : 'mismatch';

            await base44.entities.CopiedTrade.update(copiedTrade.id, {
                reconciliation_status: status,
                reconciled_at: new Date().toISOString(),
                source_exit_price: sourceTrade.exit_price,
                copied_exit_price: targetTrade.exit_price,
                source_pnl: sourceTrade.pnl,
                copied_pnl: targetTrade.pnl,
                pnl_difference: pnlDifference
            });

            if (status === 'matched') {
                matched++;
            } else {
                mismatched++;
            }
        }

        return Response.json({
            status: 'success',
            reconciled: copiedTrades.length,
            matched,
            mismatched,
            missing
        });

    } catch (error) {
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});