import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Home() {
  return <section className="mx-auto flex max-w-6xl flex-1 items-center px-6 py-24"><motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="max-w-3xl"><p className="mb-4 font-semibold text-brand-600">Prepare with confidence</p><h1 className="text-5xl font-bold tracking-tight sm:text-6xl">Your next interview starts here.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">A focused workspace for building stronger interview skills and tracking your progress.</p><div className="mt-8 flex gap-4"><Link to="/register" className="rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700">Get started</Link><Link to="/login" className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50">Sign in</Link></div></motion.div></section>;
}
