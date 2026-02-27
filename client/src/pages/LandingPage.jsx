import { useEffect, useState } from "react";
import api from "../api/axios";
import ThemeToggle from "../components/ThemeToggle";

export default function LandingPage() {
  const [news, setNews] = useState([]);

  useEffect(() => {
    api
      .get("/news?limit=10")
      .then((res) => {
        const payload = res?.data?.data;
        setNews(Array.isArray(payload) ? payload : []);
      })
      .catch(() => {
        setNews([]);
      });
  }, []);

  return (
    <div className="min-h-screen bg-page-bg">
      {/* Header */}
      <header className="bg-nav-bg text-primary-on-dark py-6 px-8 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-wide">NEGRECT</h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href="/login"
              className="bg-sidebar-active text-sidebar-active-text px-4 py-2 rounded text-sm font-medium hover:opacity-90"
            >
              Login this
            </a>
            <a
              href="/register"
              className="border border-primary-on-dark text-primary-on-dark px-4 py-2 rounded text-sm font-medium hover:bg-primary-on-dark/10"
            >
              Register
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto py-12 px-8">
        <h2 className="text-3xl font-bold text-primary-header mb-4">
          Negative Records Management System
        </h2>
        <p className="text-sidebar-text leading-relaxed max-w-2xl">
          Advanced OCR technology offers a seamless and efficient solution for handling large volumes
          of data. Automating the extraction and transcription of text from uploaded images reduces
          the time and effort required for manual data entry while enhancing accuracy. Coupled with
          the automated billing module, the system provides a robust platform for managing both
          records and billing with minimal human intervention.
        </p>
      </section>

      {/* News */}
      {news.length > 0 && (
        <section className="max-w-5xl mx-auto px-8 pb-16">
          <h3 className="text-xl font-bold text-primary-header mb-4">Latest News</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {news.map((item) => (
              <article
                key={item.id}
                className="bg-card-bg border border-card-border rounded-lg p-5"
              >
                <h4 className="font-semibold text-primary-header">{item.title}</h4>
                <p className="text-sm text-sidebar-text mt-2 line-clamp-3">{item.content}</p>
                <p className="text-xs text-sidebar-text mt-3">
                  {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
