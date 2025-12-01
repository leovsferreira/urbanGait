import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const exportAnnotations = async (annotations, fullData) => {
  const zip = new JSZip();
  const { gps, accelerometer, gyroscope, barometer, video } = fullData;

  const sliceData = (data, start, end) => {
    return data.filter(d => d.relativeTime >= start && d.relativeTime <= end);
  };

  const captureFrames = async (videoUrl, start, end, folder) => {
    return new Promise(async (resolve) => {
      const vid = document.createElement('video');
      vid.src = videoUrl;
      vid.muted = true;
      vid.crossOrigin = "anonymous";
      
      await new Promise(r => {
        vid.onloadeddata = r;
        vid.load();
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const count = 5;
      const step = (end - start) / (count + 1);

      for (let i = 1; i <= count; i++) {
        const time = start + (step * i);
        vid.currentTime = time;
        
        await new Promise(r => {
            const onSeek = () => {
                vid.removeEventListener('seeked', onSeek);
                r();
            };
            vid.addEventListener('seeked', onSeek);
        });

        canvas.width = vid.videoWidth;
        canvas.height = vid.videoHeight;
        ctx.drawImage(vid, 0, 0);
        
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8));
        folder.file(`frame_${time.toFixed(2)}s.jpg`, blob);
      }
      
      resolve();
    });
  };

  for (let i = 0; i < annotations.length; i++) {
    const ann = annotations[i];
    const folderName = `${i + 1}_${ann.label.replace(/[^a-z0-9]/gi, '_')}`;
    const folder = zip.folder(folderName);

    const record = {
      meta: {
        label: ann.label,
        startTime: ann.start,
        endTime: ann.end,
        duration: ann.end - ann.start
      },
      data: {
        gps: sliceData(gps, ann.start, ann.end),
        accelerometer: sliceData(accelerometer, ann.start, ann.end),
        gyroscope: sliceData(gyroscope, ann.start, ann.end),
        barometer: sliceData(barometer, ann.start, ann.end),
      }
    };

    folder.file("data.json", JSON.stringify(record, null, 2));

    await captureFrames(video, ann.start, ann.end, folder.folder("frames"));
  }

  // Generate and download zip
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, "urbanGait_annotations.zip");
};