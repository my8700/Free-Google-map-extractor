import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import SearchForm from './components/SearchForm';
import ProgressCard from './components/ProgressCard';
import DataTable from './components/DataTable';

// Determine API base URL
const API_BASE =
  window.location.protocol === 'file:' || window.location.port === '3000' || window.location.port === '5173'
    ? '' // In development Vite proxies /api to http://localhost:5000
    : window.location.origin;

export default function App() {
  const [keywords, setKeywords] = useState('Dentist');
  const [cityState, setCityState] = useState('Austin, TX');
  const [maxResults, setMaxResults] = useState(100);
  const [extractEmail, setExtractEmail] = useState(true);
  const [extractPhone, setExtractPhone] = useState(true);

  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState(0); // 0: idle, 1: discovering, 2: extracting, 3: done
  const [progressPct, setProgressPct] = useState(0);
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const [extractedCount, setExtractedCount] = useState(0);
  const [phoneCount, setPhoneCount] = useState(0);
  const [emailCount, setEmailCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [currentPlaceName, setCurrentPlaceName] = useState('');
  const [targetGoal, setTargetGoal] = useState(100);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [csvFilename, setCsvFilename] = useState(null);
  const [leads, setLeads] = useState([]);

  const eventSourceRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleStartScraping = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Reset state
    setLeads([]);
    setIsRunning(true);
    setPhase(1);
    setProgressPct(2);
    setDiscoveredCount(0);
    setExtractedCount(0);
    setPhoneCount(0);
    setEmailCount(0);
    setIsCompleted(false);
    setIsStopped(false);
    setCsvFilename(null);
    setCurrentPlaceName('');
    setTargetGoal(maxResults);
    setStatusMessage(`Connecting stealth browser for "${keywords} in ${cityState}"...`);

    const params = new URLSearchParams({
      keywords: keywords.trim(),
      city_state: cityState.trim(),
      max_results: maxResults,
      extract_email: extractEmail,
      extract_phone: extractPhone,
    });

    const streamUrl = `${API_BASE}/api/stream-scrape?${params.toString()}`;
    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleStreamEvent(msg, maxResults);
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    es.onerror = (err) => {
      console.error('EventSource error:', err);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsRunning(false);
      setStatusMessage('Connection lost or server stopped. Verify backend is running on port 5000.');
    };
  };

  const handleStreamEvent = (msg, maxTarget) => {
    const { event, data = {} } = msg;

    switch (event) {
      case 'phase':
        setPhase(data.phase || 1);
        if (data.message) setStatusMessage(data.message);
        break;

      case 'status':
        if (data.message) setStatusMessage(data.message);
        break;

      case 'discovering': {
        const count = data.count || 0;
        setDiscoveredCount(count);
        setStatusMessage(`[Phase 1] Discovered ${count.toLocaleString()} / ${maxTarget.toLocaleString()} places...`);
        const discPct = Math.min(40, Math.round((count / maxTarget) * 40));
        setProgressPct(discPct);
        break;
      }

      case 'discovered': {
        const tot = data.total || maxTarget;
        setDiscoveredCount(tot);
        setTargetGoal(tot);
        setProgressPct(45);
        break;
      }

      case 'extracting_item': {
        const cur = data.current || 0;
        const tot = data.total || maxTarget;
        setCurrentPlaceName(data.name || '');
        setStatusMessage(`[Phase 2] [${cur}/${tot}] Extracting: ${data.name || ''}...`);
        break;
      }

      case 'place_extracted': {
        const place = data.place || {};
        const cur = data.current || 0;
        const tot = data.total || maxTarget;

        setExtractedCount(cur);
        if (place.phone || place.whatsapp) {
          setPhoneCount((prev) => prev + 1);
        }
        if (place.email) {
          setEmailCount((prev) => prev + 1);
        }

        const extractPct = Math.min(99, Math.round(45 + (cur / tot) * 54));
        setProgressPct(extractPct);

        setLeads((prev) => [
          {
            index: cur,
            name: place.name || '',
            phone: place.phone || '',
            email: place.email || '',
            whatsapp: place.whatsapp || '',
            website: place.website || '',
            rating: place.rating || '',
            reviews_count: place.reviews_count || '',
            category: place.category || '',
            address: place.address || '',
            url: place.url || '',
          },
          ...prev,
        ]);
        break;
      }

      case 'email_updated': {
        const { index, email, whatsapp } = data;
        setLeads((prev) =>
          prev.map((lead) => {
            if (lead.index === index + 1) {
              return {
                ...lead,
                email: email || lead.email,
                whatsapp: whatsapp || lead.whatsapp,
              };
            }
            return lead;
          })
        );
        if (email) setEmailCount((prev) => prev + 1);
        break;
      }

      case 'completed': {
        const duration = data.duration || 0;
        const total = data.total || 0;
        const stopped = data.stopped;
        setIsStopped(stopped);
        setStatusMessage(
          stopped
            ? `Stopped by user at ${total} leads (${duration}s).`
            : `Extraction complete! Processed ${total} leads in ${duration}s.`
        );
        break;
      }

      case 'done': {
        setProgressPct(100);
        setIsRunning(false);
        setIsCompleted(true);
        setPhase(3);
        if (data.csv_filename) {
          setCsvFilename(data.csv_filename);
        }
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        break;
      }

      case 'error': {
        setIsRunning(false);
        setStatusMessage(`Error: ${data.message || 'Scraper failed.'}`);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        break;
      }

      default:
        break;
    }
  };

  const handleStopScraping = async () => {
    setStatusMessage('Stopping scraper and flushing leads to CSV...');
    try {
      await fetch(`${API_BASE}/api/stop`, { method: 'POST' });
    } catch (err) {
      console.error('Stop error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Header />

        <SearchForm
          keywords={keywords}
          setKeywords={setKeywords}
          cityState={cityState}
          setCityState={setCityState}
          maxResults={maxResults}
          setMaxResults={setMaxResults}
          extractEmail={extractEmail}
          setExtractEmail={setExtractEmail}
          extractPhone={extractPhone}
          setExtractPhone={setExtractPhone}
          isRunning={isRunning}
          onStart={handleStartScraping}
          onStop={handleStopScraping}
        />

        {(isRunning || phase > 0 || leads.length > 0) && (
          <ProgressCard
            phase={phase}
            progressPct={progressPct}
            discoveredCount={discoveredCount}
            extractedCount={extractedCount}
            phoneCount={phoneCount}
            emailCount={emailCount}
            statusMessage={statusMessage}
            currentPlaceName={currentPlaceName}
            targetGoal={targetGoal}
            isCompleted={isCompleted}
            isStopped={isStopped}
          />
        )}

        <DataTable
          leads={leads}
          csvFilename={csvFilename}
          targetGoal={targetGoal}
        />

        <footer className="text-center text-xs text-slate-400 py-6">
          <p>
            Google Maps Lead Harvester &bull; Open-Source Distributed B2B Scraping Engine &bull; Released under MIT License
          </p>
        </footer>
      </div>
    </div>
  );
}
