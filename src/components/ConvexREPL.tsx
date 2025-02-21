import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

interface REPLHistoryEntry {
  input: string;
  output: string | null;
  error?: string;
}

const ConvexREPL: React.FC = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<REPLHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  // REST endpoint URL - replace with your actual endpoint
  const API_ENDPOINT = 'http://peer.convex.live:8080/api/v1/query';

  // Scroll to bottom of history when it updates
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history]);

  const evaluateExpression = async (expr: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(API_ENDPOINT, {
        source: expr,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      console.log(response);

      return {
        input: expr,
        output: response.data.value,
      };
    } catch (error) {
      return {
        input: expr,
        output: null,
        error: error.response?.data?.error || 'Network error or invalid expression',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const trimmedInput = input.trim();
    setInput('');
    
    const result = await evaluateExpression(trimmedInput);
    setHistory(prev => [...prev, result]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="lisp-repl-container">
      <div className="repl-header">
        <h3>Lisp REPL</h3>
        <span className="repl-info">
          Type Convex expressions and press Enter to evaluate
        </span>
      </div>

      <div className="repl-history" ref={historyRef}>
        {history.map((entry, index) => (
          <div key={index} className="history-entry">
            <div className="input-line">
              <span className="prompt">&gt;</span>
              <span>{entry.input}</span>
            </div>
            {entry.output && (
              <div className="output-line">{entry.output}</div>
            )}
            {entry.error && (
              <div className="error-line">{entry.error}</div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="loading">Evaluating...</div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="repl-input-form">
        <div className="input-wrapper">
          <span className="prompt">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter Lisp expression (e.g., (+ 2 3))"
            disabled={isLoading}
            className="repl-input"
          />
        </div>
      </form>
    </div>
  );
};

export default ConvexREPL;