const express = require('express');
const router = express.Router();
const News = require('../Models/News');

// GET: All News (for admin)
router.get('/', async (req, res) => {
  try {
    const news = await News.find().sort({ createdAt: -1 });
    res.json(news);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch news', error: err.message });
  }
});

// GET: Approved news only (for frontend)
router.get('/approved', async (req, res) => {
  try {
    const approvedNews = await News.find({ status: 'approved' }).sort({ createdAt: -1 });
    res.json(approvedNews);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch approved news', error: err.message });
  }
});

// GET: Single News by ID
router.get('/:id', async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ message: 'News not found' });
    res.json(news);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch news', error: err.message });
  }
});

// POST: Create News (admin only)
router.post('/', async (req, res) => {
  try {
    const newNews = new News(req.body);
    await newNews.save();
    res.status(201).json({ message: 'News created', news: newNews });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create news', error: err.message });
  }
});

// PUT: Approve News by ID (admin)
router.put('/:id/approve', async (req, res) => {
  try {
    const approved = await News.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    );
    if (!approved) return res.status(404).json({ message: 'News not found' });
    res.json({ message: 'News approved ✅', news: approved });
  } catch (err) {
    res.status(500).json({ message: 'Failed to approve news', error: err.message });
  }
});

// DELETE: Delete News
router.delete('/:id', async (req, res) => {
  try {
    await News.findByIdAndDelete(req.params.id);
    res.json({ message: 'News deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete news', error: err.message });
  }
});

module.exports = router;
