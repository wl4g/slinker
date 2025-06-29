import { redirect } from "next/navigation";
import { getShortenedUrl, incrementClicks, initializeDatabase } from "@/lib/db";

export default async function RedirectPage({
  params,
}: {
  params: { shortCode: string };
}) {
  const { shortCode } = params;

  try {
    console.log("🔍 Accessing short code:", shortCode);

    // Initialize database
    await initializeDatabase();

    // Find the URL in database
    const urlData = await getShortenedUrl(shortCode);

    if (!urlData) {
      console.log("❌ Short URL not found:", shortCode);
      // If URL not found, redirect to home page
      redirect("/");
    }

    console.log("✅ Found URL data:", urlData);

    // Increment click counter (async, don't wait)
    incrementClicks(shortCode).catch((error) =>
      console.error("Error incrementing clicks:", error)
    );

    // Ensure the URL has a protocol
    let targetUrl = urlData.original_url;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    console.log("🚀 Redirecting to:", targetUrl);

    // Redirect to the original URL immediately
    return redirect(targetUrl + "?from=linkshort");
  } catch (error) {
    // TODO: Strangeness? Why does Nextjs normally throw an exception to redirect?
    if (error instanceof Error && error.message == "NEXT_REDIRECT") {
      let targetUrl = error.digest.split(";")[2];
      console.log("🚀 Redirecting to:", targetUrl);
      return redirect(targetUrl);
    }
    console.error("❌ Real error:", error);
    return redirect("/?error");
  }
}

// This is required for static export
export function generateStaticParams() {
  return [];
}
