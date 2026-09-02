import { Readable } from "stream";
import { Router, type IRouter } from "express";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

router.get("/storage/objects/*path", async (req, res) => {
  try {
    const raw = req.params.path;
    const path = `/objects/${Array.isArray(raw) ? raw.join("/") : raw}`;
    const response = await storage.downloadObject(await storage.getObjectEntityFile(path));
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    else res.end();
  } catch (error) {
    if (error instanceof ObjectNotFoundError) res.status(404).json({ error: "Object not found" });
    else {
      req.log.error({ err: error }, "Error serving private object");
      res.status(500).json({ error: "Failed to serve object" });
    }
  }
});

export default router;