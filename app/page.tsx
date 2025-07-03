"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Copy,
  Link,
  BarChart3,
  History,
  ExternalLink,
  Check,
  Database,
  Cloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import AuthButton from "@/components/ui/AuthButton";

interface ShortenedUrl {
  id: string;
  originalUrl: string;
  shortCode: string;
  createdAt: string;
  clicks: number;
  userEmail: string;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [shortenedUrls, setShortenedUrls] = useState<ShortenedUrl[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDatabaseConnected, setIsDatabaseConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [storageType, setStorageType] = useState<"vercel" | "memory">("memory");

  // Check database connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch("/api/shorten");
        setIsDatabaseConnected(response.ok);
        if (response.ok) {
          const data = await response.json();
          setShortenedUrls(data);

          // Determine storage type based on environment
          const isProduction = window.location.hostname !== "127.0.0.1";
          setStorageType(isProduction ? "vercel" : "memory");
        }
      } catch (error) {
        console.error("Database connection check failed:", error);
        setIsDatabaseConnected(false);
      } finally {
        setIsCheckingConnection(false);
      }
    };

    checkConnection();
  }, []);

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleShorten = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    if (!isValidUrl(url)) {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/shorten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to shorten URL");
      }

      const data = await response.json();
      setShortenedUrls((prev) => [data, ...prev]);
      setUrl("");
      toast.success("URL shortened successfully!");

      // Update connection status
      setIsDatabaseConnected(true);
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to shorten URL. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = useCallback(async (shortUrl: string, id: string) => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedId(id);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  }, []);

  const getShortUrl = (shortCode: string) => {
    return `${window.location.origin}/${shortCode}`;
  };

  const getStorageInfo = () => {
    if (storageType === "vercel") {
      return {
        icon: <Database className="h-4 w-4" />,
        text: "Vercel Postgres Connected",
        color: "bg-green-100 text-green-700",
      };
    } else {
      return {
        icon: <Cloud className="h-4 w-4" />,
        text: "Local Development Mode",
        color: "bg-blue-100 text-blue-700",
      };
    }
  };

  const storageInfo = getStorageInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Link className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  SLinker
                </h1>
                <p className="text-sm text-gray-600">
                  Professional URL Shortener
                </p>
              </div>
            </div>

            {/* Storage Status */}
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  isCheckingConnection
                    ? "bg-yellow-100 text-yellow-700"
                    : isDatabaseConnected
                    ? storageInfo.color
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isCheckingConnection ? (
                  <>
                    <Database className="h-4 w-4" />
                    Checking Connection...
                  </>
                ) : isDatabaseConnected ? (
                  <>
                    {storageInfo.icon}
                    {storageInfo.text}
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Storage Not Available
                  </>
                )}
              </div>
              <AuthButton />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Development Info */}
        {!isCheckingConnection &&
          isDatabaseConnected &&
          storageType === "memory" && (
            <Card className="mb-8 bg-blue-50/70 backdrop-blur-sm border-blue-200 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Cloud className="h-5 w-5" />
                  Local Development Mode
                </CardTitle>
                <CardDescription className="text-blue-700">
                  You're running in local development mode with in-memory
                  storage. URLs will be lost when the server restarts. Deploy to
                  Vercel and add Postgres database for persistent storage.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

        {/* Connection Error */}
        {!isCheckingConnection && !isDatabaseConnected && (
          <Card className="mb-8 bg-red-50/70 backdrop-blur-sm border-red-200 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <Database className="h-5 w-5" />
                Storage Error
              </CardTitle>
              <CardDescription className="text-red-700">
                Unable to connect to storage. Please check your configuration or
                try refreshing the page.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Shorten Your{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Links
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Transform long URLs into clean, manageable short links. Perfect for
            social media, email campaigns, and anywhere you need to share links
            efficiently.
          </p>
        </div>

        {/* URL Shortener Form */}
        <Card className="mb-8 bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Shorten URL
            </CardTitle>
            <CardDescription>
              Enter a long URL to generate a short, shareable link
              {storageType === "vercel"
                ? " stored in Vercel Postgres"
                : " (temporary storage in development)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  type="url"
                  placeholder="https://notion.so/your-very-long-page-url-that-needs-shortening"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleShorten()}
                  className="h-12 text-lg"
                />
              </div>
              <Button
                onClick={handleShorten}
                disabled={isLoading}
                className="h-12 px-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold"
              >
                {isLoading ? "Shortening..." : "Shorten"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Shortened URLs History */}
        {shortenedUrls.length > 0 && (
          <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Your Shortened URLs
              </CardTitle>
              <CardDescription>
                Manage and track your shortened links
                {storageType === "vercel"
                  ? " stored in Vercel Postgres"
                  : " (temporary storage)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shortenedUrls.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-4 bg-white/50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            SHORT
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {storageType === "vercel" ? (
                              <>
                                <Database className="h-3 w-3 mr-1" />
                                VERCEL POSTGRES
                              </>
                            ) : (
                              <>
                                <Cloud className="h-3 w-3 mr-1" />
                                LOCAL DEV
                              </>
                            )}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="font-mono text-blue-600 font-semibold mb-1 break-all">
                          {getShortUrl(item.shortCode)}
                        </div>
                        <div
                          className="text-sm text-gray-600 truncate"
                          title={item.originalUrl}
                        >
                          <ExternalLink className="h-3 w-3 inline mr-1" />
                          {item.originalUrl}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {item.clicks} clicks
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleCopy(getShortUrl(item.shortCode), item.id)
                          }
                          className="gap-1"
                        >
                          {copiedId === item.id ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          {copiedId === item.id ? "Copied!" : "Copy"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(getShortUrl(item.shortCode), "_blank")
                          }
                          className="gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Test
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <Card className="bg-white/50 backdrop-blur-sm border-white/20">
            <CardHeader>
              <div className="p-2 bg-blue-100 rounded-lg w-fit">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Smart Storage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Automatically uses Vercel Postgres in production for persistent
                storage, with in-memory fallback for local development.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/50 backdrop-blur-sm border-white/20">
            <CardHeader>
              <div className="p-2 bg-purple-100 rounded-lg w-fit">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Real-time Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Track click-through rates and monitor the performance of your
                shortened links with real-time statistics.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/50 backdrop-blur-sm border-white/20">
            <CardHeader>
              <div className="p-2 bg-indigo-100 rounded-lg w-fit">
                <Copy className="h-6 w-6 text-indigo-600" />
              </div>
              <CardTitle>Production Ready</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Built with Next.js and Vercel Postgres for scalability,
                reliability, and production-grade performance.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
