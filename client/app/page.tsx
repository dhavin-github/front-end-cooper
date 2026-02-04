'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getEvents, createEvent } from '@/lib/api';
import { Plus, ArrowRight, Loader2, Calendar, Wallet, LogOut } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Auth Check
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));
    fetchEvents();
  }, [router]);

  const fetchEvents = async () => {
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        router.push('/login');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    setIsCreating(true);
    try {
      await createEvent({ name: newEventName, created_by: user.id }); // Use logged in user ID
      setNewEventName('');
      fetchEvents();
    } catch (err) {
      alert('Failed to create event');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) return <div className="flex justify-center h-screen items-center"><Loader2 className="animate-spin h-10 w-10 text-emerald-600" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* User Greeting */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2 text-slate-600">
          <span className="font-medium">Hello, {user?.name}</span>
        </div>
        <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 font-medium">
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>

      {/* Hero Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Your Events</h1>
          <p className="text-lg text-slate-500 mt-2">Manage shared wallets and expenses effortlessly.</p>
        </div>

        <form onSubmit={handleCreate} className="flex gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="e.g. Ski Trip 2024"
            className="border border-slate-300 rounded-lg px-4 py-2.5 w-full md:w-64 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm text-sm"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
          />
          <button
            disabled={isCreating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-70 whitespace-nowrap"
          >
            {isCreating ? <Loader2 className="animate-spin h-5 w-5" /> : <Plus className="h-5 w-5" />}
            Create Event
          </button>
        </form>
      </div>

      {/* Content */}
      {events.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm max-w-2xl mx-auto">
          <div className="bg-slate-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No events found</h3>
          <p className="text-slate-500 mt-2">Get started by creating your first shared event above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evt) => (
            <Link key={evt.id} href={`/events/${evt.id}`} className="group block bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-emerald-200 transition-all duration-200 overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${evt.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                    {evt.status}
                  </span>
                </div>

                <h3 className="font-bold text-xl text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">{evt.name}</h3>
                <p className="text-slate-500 text-sm mb-6 line-clamp-2 min-h-[2.5em]">
                  {evt.description || 'No description provided.'}
                </p>

                <div className="flex justify-between items-end border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pool Balance</p>
                    <p className={`font-mono text-2xl font-bold ${evt.pool_balance < 0 ? 'text-red-500' : 'text-slate-900'}`}>
                      ${evt.pool_balance.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-full group-hover:bg-emerald-500 group-hover:text-white transition-all text-slate-400">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
