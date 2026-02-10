import Link from "next/link";
import { Puzzle } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary-600">
                <Puzzle className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-foreground">
                crossword.network
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Cozy crossword puzzles with progress tracking and a focused solving experience.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/puzzles" 
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Puzzles
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/help" 
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/faq" 
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link 
                  href="/terms" 
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy" 
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  href="/cookies" 
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8">
          <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
            <p className="text-sm text-muted-foreground">
              © 2024 Maple-Tyne Technologies Inc. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              crossword.network is a trademark of Maple-Tyne Technologies Inc.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
