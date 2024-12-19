'use client';
import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="p-4 border-b border-gray-800">
      <div className="max-w-7xl mx-auto flex items-center">
        <h1 className="text-xl font-bold">Seightly</h1>
        <div className="ml-8 space-x-6">
          <Link href="/setup" className="text-gray-300 hover:text-white">Setup</Link>
          <Link href="/topics" className="text-gray-300 hover:text-white">Topics & Queries</Link>
          <Link href="/monitoring" className="text-gray-300 hover:text-white">Monitoring</Link>
        </div>
      </div>
    </nav>
  )
}