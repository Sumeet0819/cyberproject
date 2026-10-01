import { z } from 'zod';

export const CreateWebsiteSchema = z.object({
  domain: z.string()
    .min(3)
    .max(253)
    .regex(/^(https?:\/\/)?([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/, "Invalid domain format")
});
