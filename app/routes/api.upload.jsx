import { data } from "react-router";
import { authenticate } from "../shopify.server";
import path from "path";
import fs from "fs/promises";

export const action = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
        return data({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = `${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, '_')}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadDir, fileName);

    await fs.writeFile(filePath, buffer);

    return {
        url: `/uploads/${fileName}`,
        fileName: file.name
    };
};
