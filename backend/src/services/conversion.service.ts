import puppeteer from 'puppeteer';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { config } from '../config';
import { Conversion } from '../models/Conversion';
import { uploadToCloudinary } from './cloudinary.service';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

export class ConversionService {
  private static instance: ConversionService;
  private tempDir: string;

  private constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  public static getInstance(): ConversionService {
    if (!ConversionService.instance) {
      ConversionService.instance = new ConversionService();
    }
    return ConversionService.instance;
  }

  async convertHtmlToVideo(conversionId: string): Promise<void> {
    const conversion = await Conversion.findById(conversionId);
    if (!conversion) {
      throw new Error('Conversion not found');
    }

    try {
      // Update status to processing
      conversion.status = 'processing';
      await conversion.save();

      // Create temporary files
      const sessionId = uuidv4();
      const htmlPath = path.join(this.tempDir, `${sessionId}.html`);
      const framesDir = path.join(this.tempDir, sessionId);
      const outputPath = path.join(this.tempDir, `${sessionId}.mp4`);

      // Create frames directory
      await mkdir(framesDir);

      // Write HTML to file
      await writeFile(htmlPath, conversion.html);

      // Launch browser and capture frames
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setViewport({
        width: config.video.width,
        height: config.video.height,
      });

      // Load HTML
      await page.goto(`file://${htmlPath}`);

      // Capture frames
      const totalFrames = config.video.fps * config.video.duration;
      for (let i = 0; i < totalFrames; i++) {
        await page.screenshot({
          path: path.join(
            framesDir,
            `frame-${i.toString().padStart(6, '0')}.png`
          ),
        });
        conversion.progress = Math.floor((i / totalFrames) * 100);
        await conversion.save();
      }

      await browser.close();

      // Convert frames to video
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(path.join(framesDir, 'frame-%06d.png'))
          .inputFPS(config.video.fps)
          .outputOptions('-c:v libx264')
          .outputOptions('-pix_fmt yuv420p')
          .output(outputPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      });

      // Upload to Cloudinary
      const videoUrl = await uploadToCloudinary(outputPath);

      // Update conversion record
      conversion.status = 'completed';
      conversion.progress = 100;
      conversion.videoUrl = videoUrl;
      await conversion.save();

      // Cleanup
      await unlink(htmlPath);
      await unlink(outputPath);
      fs.rmSync(framesDir, { recursive: true, force: true });
    } catch (error) {
      conversion.status = 'failed';
      conversion.error = error.message;
      await conversion.save();
      throw error;
    }
  }
}
