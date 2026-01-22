
import assert from 'node:assert';
import { Buffer } from 'node:buffer';

const BASE_URL = "https://file60.abhaysharma-as2719.workers.dev";

async function testProduction() {
    console.log(`\n🧪 Testing Production Worker at ${BASE_URL}\n`);

    // 1. Init Session
    console.log("1. Initializing Session...");
    const initRes = await fetch(`${BASE_URL}/api/init-session`);
    if (!initRes.ok) throw new Error(`Init failed: ${initRes.status} ${await initRes.text()}`);

    const initData = await initRes.json();
    console.log("   ✅ Valid Token received");
    const token = initData.token;

    // 2. Create File Entry
    console.log("\n2. Creating File Entry...");
    const fileName = "prod-test.txt";
    const fileContent = "Hello from the production test script!";

    const createRes = await fetch(`${BASE_URL}/api/create-file`, {
        method: "POST",
        headers: {
            "x-session-token": token,
            "X-File-Name": encodeURIComponent(fileName),
            "Content-Length": Buffer.byteLength(fileContent).toString(),
            "Content-Type": "text/plain"
        }
    });

    if (!createRes.ok) throw new Error(`Create failed: ${createRes.status} ${await createRes.text()}`);

    const createData = await createRes.json();
    console.log("   ✅ File entry created");
    console.log(`   📂 ID: ${createData.id}`);
    console.log(`   🔗 Public URL: ${createData.url}`);

    // 3. Upload File to R2 (via Presigned URL)
    console.log("\n3. Uploading content to R2...");
    const uploadRes = await fetch(createData.upload_url, {
        method: "PUT",
        body: fileContent,
        headers: {
            "Content-Type": "text/plain"
        }
    });

    if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
    console.log("   ✅ Upload successful");

    // 4. Download and Verify
    console.log("\n4. Verifying Download...");

    // R2 eventual consistency might delay it slightly, but usually instant for read-after-write key access
    // if using Strong Consistency (default in R2). 
    // However, if we are hitting the Worker's /api/file endpoint, it essentially proxies or redirects.
    // If we are hitting a Public R2 URL (if configured), it might be 304 cached.

    const downloadRes = await fetch(createData.url);
    if (!downloadRes.ok) throw new Error(`Download failed: ${downloadRes.status} ${await downloadRes.text()}`);

    const downloadedContent = await downloadRes.text();

    if (downloadedContent === fileContent) {
        console.log("   ✅ Content matched!");
    } else {
        console.error("   ❌ Content mismatch!");
        console.error("      Expected:", fileContent);
        console.error("      Received:", downloadedContent);
        process.exit(1);
    }

    console.log("\n🎉 ALL TESTS PASSED!");
}

testProduction().catch(err => {
    console.error("\n❌ TEST FAILED:", err);
    process.exit(1);
});
