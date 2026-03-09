const express = require('express');
const Product = require('../models/Product');
const Project = require('../models/Project');
const Machinery = require('../models/Machinery');
const News = require('../models/News');
const Lead = require('../models/Lead');
const Report = require('../models/Report');
const { authenticateToken, requireRoles } = require('../middleware/auth');

const router = express.Router();
const ANALYTICS_ROLES = ['SuperAdmin', 'OperationsAdmin', 'Engineer', 'EngineeringOps'];

router.get('/summary', authenticateToken, requireRoles(ANALYTICS_ROLES), async (req, res) => {
  try {
    const [products, projects, machinery, news, leads, reports] = await Promise.all([
      Product.countDocuments(),
      Project.countDocuments(),
      Machinery.countDocuments(),
      News.countDocuments(),
      Lead.countDocuments(),
      Report.countDocuments()
    ]);

    const [newLeads, contactedLeads, qualifiedLeads, wonLeads, lostLeads] = await Promise.all([
      Lead.countDocuments({ status: 'new' }),
      Lead.countDocuments({ status: 'contacted' }),
      Lead.countDocuments({ status: 'qualified' }),
      Lead.countDocuments({ status: 'won' }),
      Lead.countDocuments({ status: 'lost' })
    ]);

    return res.json({
      success: true,
      data: {
        totals: { products, projects, machinery, news, leads, reports },
        funnel: {
          new: newLeads,
          contacted: contactedLeads,
          qualified: qualifiedLeads,
          won: wonLeads,
          lost: lostLeads
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load analytics summary.' });
  }
});

module.exports = router;
