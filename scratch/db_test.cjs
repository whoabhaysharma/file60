const { createClient } = require("@libsql/client");
const fs = require("fs");

async function test() {
    const env = fs.readFileSync(".env", "utf8");
    const dbUrl = env.match(/BUNNY_DATABASE_URL=(.+)/)[1].trim().replace(/^["\x27]|["\x27]$/g, "").replace("libsql://", "https://");
    const dbToken = env.match(/BUNNY_DATABASE_AUTH_TOKEN=(.+)/)[1].trim().replace(/^["\x27]|["\x27]$/g, "");
    
    console.log("Connecting to:", dbUrl);
    const client = createClient({ url: dbUrl, authToken: dbToken });
    
    const id = "test-" + Date.now();
    try {
        await client.execute({
            sql: "INSERT INTO files (id, name, content_type, size, object_key, created_at, expires_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            args: [id, "test.txt", "text/plain", 123, "temp/test.txt", Math.floor(Date.now()/1000), Math.floor(Date.now()/1000) + 3600, "pending"]
        });
        console.log("Insert success!");
        await client.execute({ sql: "DELETE FROM files WHERE id = ?", args: [id] });
        console.log("Cleanup success!");
    } catch (err) {
        console.error("Insert failed!");
        console.error("Error name:", err.name);
        console.error("Error message:", err.message);
        if (err.rawCode) console.error("Raw code:", err.rawCode);
    }
}

test();
