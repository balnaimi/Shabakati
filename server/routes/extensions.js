import { Router } from 'express';
import { dbFunctions } from '../database.js';
import { requireAdmin, requireVisitor } from '../middleware.js';
import { jsonInternalError } from '../errorHandler.js';
import { getScanProgress } from '../scanProgress.js';
import { isIPInNetwork } from '../networkUtils.js';

const router = Router();

router.get('/search', requireVisitor, (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    if (!q || q.length < 2) {
      return res.json([]);
    }
    const networks = dbFunctions.getAllNetworks();
    const hosts = dbFunctions.getAllHosts();
    const matches = hosts.filter((h) => {
      const name = (h.name || '').toLowerCase();
      const ip = (h.ip || '').toLowerCase();
      return name.includes(q) || ip.includes(q);
    });
    res.json(
      matches.slice(0, 25).map((h) => ({
        id: h.id,
        name: h.name,
        ip: h.ip,
        status: h.status,
        networkId: networks.find((n) => isIPInNetwork(h.ip, n.network_id, n.subnet))?.id ?? null
      }))
    );
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.get('/uptime', requireVisitor, (req, res) => {
  try {
    res.json(dbFunctions.getUptimeOverview());
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.get('/metrics', requireVisitor, (req, res) => {
  try {
    const hosts = dbFunctions.getAllHosts();
    const networks = dbFunctions.getAllNetworks();
    const online = hosts.filter((h) => h.status === 'online').length;
    const lines = [
      '# HELP shabakati_hosts_total Total registered hosts',
      '# TYPE shabakati_hosts_total gauge',
      `shabakati_hosts_total ${hosts.length}`,
      '# HELP shabakati_hosts_online Hosts currently online',
      '# TYPE shabakati_hosts_online gauge',
      `shabakati_hosts_online ${online}`,
      '# HELP shabakati_networks_total Configured networks',
      '# TYPE shabakati_networks_total gauge',
      `shabakati_networks_total ${networks.length}`
    ];
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(`${lines.join('\n')}\n`);
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.get('/settings/webhook', requireAdmin, (req, res) => {
  try {
    const url = process.env.WEBHOOK_URL?.trim() || dbFunctions.getAppSetting('webhook_url') || '';
    res.json({ url, source: process.env.WEBHOOK_URL ? 'env' : 'db' });
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.put('/settings/webhook', requireAdmin, (req, res) => {
  try {
    const url = String(req.body?.url || '').trim();
    if (process.env.WEBHOOK_URL) {
      return res.status(400).json({ error: 'WEBHOOK_URL is set in environment; unset it to use UI.' });
    }
    if (url && !/^https?:\/\/.+/i.test(url)) {
      return res.status(400).json({ error: 'Invalid webhook URL' });
    }
    if (url) {
      dbFunctions.setAppSetting('webhook_url', url);
    } else {
      dbFunctions.setAppSetting('webhook_url', '');
    }
    res.json({ url, saved: true });
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

router.get('/networks/:id/scan/progress', requireVisitor, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const progress = getScanProgress(id);
    res.json(progress || { status: 'idle' });
  } catch (error) {
    res.status(500).json(jsonInternalError(error));
  }
});

export default router;
