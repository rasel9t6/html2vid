import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from './config';
import { Conversion } from './models/Conversion';
import { ConversionService } from './services/conversion.service';

const app = express();

// Middleware
app.use(
  cors({
    origin: config.frontendUrl,
  })
);
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(config.mongodbUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Routes
app.post('/api/convert', async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    const conversion = new Conversion({ html });
    await conversion.save();

    // Start conversion process
    ConversionService.getInstance()
      .convertHtmlToVideo(conversion._id)
      .catch((error) => console.error('Conversion error:', error));

    res.json({ id: conversion._id });
  } catch (error) {
    console.error('Error creating conversion:', error);
    res.status(500).json({ error: 'Failed to create conversion' });
  }
});

app.get('/api/status/:id', async (req, res) => {
  try {
    const conversion = await Conversion.findById(req.params.id);
    if (!conversion) {
      return res.status(404).json({ error: 'Conversion not found' });
    }

    res.json({
      status: conversion.status,
      progress: conversion.progress,
      videoUrl: conversion.videoUrl,
      error: conversion.error,
    });
  } catch (error) {
    console.error('Error getting conversion status:', error);
    res.status(500).json({ error: 'Failed to get conversion status' });
  }
});

// Start server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
