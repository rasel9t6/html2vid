'use client';

import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [html, setHtml] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const { toast } = useToast();

  const handleConvert = async () => {
    if (!html.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter some HTML content',
        variant: 'destructive',
      });
      return;
    }

    setIsConverting(true);
    setProgress(0);
    setVideoUrl('');

    try {
      const response = await axios.post('http://localhost:3001/api/convert', {
        html,
      });

      // Poll for progress
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await axios.get(
            `http://localhost:3001/api/status/${response.data.id}`
          );
          setProgress(statusResponse.data.progress);

          if (statusResponse.data.status === 'completed') {
            clearInterval(pollInterval);
            setVideoUrl(statusResponse.data.videoUrl);
            setIsConverting(false);
            toast({
              title: 'Success',
              description: 'Video conversion completed!',
            });
          } else if (statusResponse.data.status === 'failed') {
            clearInterval(pollInterval);
            setIsConverting(false);
            toast({
              title: 'Error',
              description: 'Video conversion failed',
              variant: 'destructive',
            });
          }
        } catch (error) {
          clearInterval(pollInterval);
          setIsConverting(false);
          toast({
            title: 'Error',
            description: 'Failed to check conversion status',
            variant: 'destructive',
          });
        }
      }, 1000);
    } catch (error) {
      setIsConverting(false);
      toast({
        title: 'Error',
        description: 'Failed to start conversion',
        variant: 'destructive',
      });
    }
  };

  return (
    <main className='min-h-screen flex items-center justify-center bg-background'>
      <Card className='w-full max-w-xl shadow-lg'>
        <CardHeader>
          <CardTitle className='text-center'>HTML to Video Converter</CardTitle>
          <CardDescription className='text-center'>
            Paste your HTML below and convert it into a video in seconds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-2'>
            <label
              className='text-sm font-medium'
              htmlFor='html-input'
            >
              HTML Content
            </label>
            <textarea
              id='html-input'
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder='<div>Your HTML content here...</div>'
              className='w-full h-40 p-4 rounded-md border border-input bg-background font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary'
            />
          </div>
          {isConverting && (
            <div className='space-y-2 mt-4'>
              <p className='text-sm text-muted-foreground'>
                Converting... {progress}%
              </p>
              <Progress
                value={progress}
                className='w-full'
              />
            </div>
          )}
          {videoUrl && (
            <div className='space-y-2 mt-4'>
              <p className='text-sm font-medium'>Your video is ready!</p>
              <video
                controls
                className='w-full rounded-lg'
                src={videoUrl}
              />
              <a
                href={videoUrl}
                download='converted-video.mp4'
                className='block w-full text-center mt-2 py-2 rounded bg-primary text-white font-semibold hover:bg-primary/90 transition'
              >
                Download Video
              </a>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleConvert}
            disabled={isConverting}
            className='w-full'
            size='lg'
          >
            {isConverting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Converting...
              </>
            ) : (
              'Convert to Video'
            )}
          </Button>
        </CardFooter>
      </Card>
      <Toaster />
    </main>
  );
}
