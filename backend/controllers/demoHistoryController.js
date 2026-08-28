const { generateDemoHistory } = require('../services/demoHistoryGenerator/index');
const { createAuditLog } = require('../utils/adminStore');

// ============================================================
// POST /api/admin/customers/:id/generate-history/stream (SSE version)
// ============================================================
exports.generateCustomerHistoryStream = async (req, res) => {
  const { id } = req.params;
  const adminId = req.userId;
  const config = req.body;

  if (!config) {
    return res.status(400).json({ success: false, message: 'Configuration is required' });
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const onProgress = (update) => {
    res.write(`data: ${JSON.stringify(update)}\n\n`);
  };

  try {
    onProgress({ step: 'start', message: 'Starting generation...', percent: 0 });

    const result = await generateDemoHistory(Number(id), config, onProgress);

    await createAuditLog({
      adminId,
      action: 'generate_demo_history',
      entityType: 'user',
      entityId: Number(id),
      description: `Generated demo financial history for customer #${id}`,
      metadata: { config: { ...config, openingBalance: config.openingBalance, targetEndingBalance: config.targetEndingBalance } },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    onProgress({ step: 'complete', message: 'Financial history generated successfully!', percent: 100, result });
    res.write(`event: done\ndata: ${JSON.stringify({ success: true, ...result })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Generate demo history error:', error);
    res.write(`event: error\ndata: ${JSON.stringify({ success: false, message: error.message })}\n\n`);
    res.end();
  }
};
