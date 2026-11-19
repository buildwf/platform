import { defineHandler } from '@builtbyfriends/bwf';
import { storage } from '@builtbyfriends/bwf/storage';

export const GET = defineHandler(async () => {
  const list = await storage.list({ limit: 20 });
  return list.objects.map((obj) => ({
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded.toISOString(),
  }));
});

export const POST = defineHandler(async (c) => {
  const formData = await c.req.parseBody();
  const file = formData['file'];
  if (file instanceof File && file.size > 0) {
    await storage.put(file.name, file.stream(), { httpMetadata: { contentType: file.type } });
  }
  return { ok: true };
});

export const DELETE = defineHandler(async (c) => {
  await storage.delete(c.req.query('key') ?? '');
  return { ok: true };
});
