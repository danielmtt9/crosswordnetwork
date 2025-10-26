import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Calendar, User } from "lucide-react";
import fs from "fs";
import path from "path";
import { marked } from "marked";

export default function PrivacyPage() {
  // Read markdown content
  const markdownPath = path.join(process.cwd(), 'content', 'legal', 'privacy.md');
  const markdownContent = fs.readFileSync(markdownPath, 'utf8');
  const htmlContent = marked(markdownContent);
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <h1 className="text-xl font-bold">Privacy Policy</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Document Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Privacy Policy</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Last updated: January 15, 2024
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      Crossword.Network
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Privacy Content */}
          <Card>
            <CardContent className="prose prose-gray dark:prose-invert max-w-none">
              <div 
                className="markdown-content"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" asChild>
              <Link href="/legal/terms">
                Terms of Service
              </Link>
            </Button>
            <Button asChild>
              <Link href="/">
                Back to Home
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
