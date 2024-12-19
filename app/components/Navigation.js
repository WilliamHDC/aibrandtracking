'use client';
import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="p-4 border-b border-gray-800">
      <div className="max-w-7xl mx-auto flex items-center">
        <h1 className="text-xl font-bold text-white">Seightly</h1>
        <div className="ml-8 space-x-6">
          <a href="/setup" className="text-gray-300 hover:text-white">Setup</a>
          <a href="/topics" className="text-gray-300 hover:text-white">Topics & Queries</a>
          <a href="/monitoring" className="text-gray-300 hover:text-white">Monitoring</a>
        </div>
      </div>
    </nav>
  )
}