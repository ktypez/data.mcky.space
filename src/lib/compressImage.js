const MAX_DIMENSION = 1024;

async function decodeViaImageElement(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error('decode failed')); img.src = url; });
    if (!img.naturalWidth || !img.naturalHeight) return null;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);
    return await createImageBitmap(canvas);
  } catch { return null; } finally { URL.revokeObjectURL(url); }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

export async function compressImage(file, maxSizeMB = 0.5) {
  const target = maxSizeMB * 1024 * 1024;
  if (file.type === 'image/jpeg' && file.size <= target) return file;
  try {
    let bitmap = null;
    try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch { bitmap = await decodeViaImageElement(file); }
    if (!bitmap) return file;
    let w = bitmap.width, h = bitmap.height;
    if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
      const r = Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h);
      w = Math.round(w * r); h = Math.round(h * r);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    let lo = 0.1, hi = 0.7, blob = null;
    for (let i = 0; i < 6; i++) {
      const mid = Math.round((lo + hi) * 10) / 10;
      blob = await canvasToBlob(canvas, 'image/jpeg', mid);
      if (blob && blob.size > target) hi = mid - 0.1;
      else lo = mid;
      if (blob && blob.size <= target) break;
    }
    if (blob) return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
  } catch { /* fall through */ }
  return file;
}

export async function makeThumbDataUrl(source, size = 96) {
  try {
    let bitmap = null;
    if (typeof source === 'string') {
      const res = await fetch(source);
      const blob = await res.blob();
      try { bitmap = await createImageBitmap(blob); } catch { bitmap = null; }
    } else {
      try { bitmap = await createImageBitmap(source); } catch { bitmap = await decodeViaImageElement(source); }
    }
    if (!bitmap) return null;
    const r = Math.min(size / bitmap.width, size / bitmap.height, 1);
    const w = Math.max(1, Math.round(bitmap.width * r));
    const h = Math.max(1, Math.round(bitmap.height * r));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.6);
    if (!blob) return null;
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}
