const News = require('../Models/News');

// Create News
exports.createNews = async (req, res) => {
  try {
    const { title, content } = req.body;
    const news = new News({ title, content });
    await news.save();
    res.status(201).json({ message: 'News created', news });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create news', error: err.message });
  }
};

// Get All News
exports.getAllNews = async (req, res) => {
  try {
    const newsList = await News.find()
      .sort({ createdAt: -1 }) // still sort by date
      .select("-createdAt -updatedAt"); // but don’t return them
    res.json(newsList);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch news", error: err.message });
  }
};


// Get News By ID
exports.getNewsById = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) return res.status(404).json({ message: 'News not found' });
    res.json(news);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch news', error: err.message });
  }
};

// Delete News
exports.deleteNews = async (req, res) => {
  try {
    await News.findByIdAndDelete(req.params.id);
    res.json({ message: 'News deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete news', error: err.message });
  }
};
