import Link from "next/link";
import { ArrowRight, Shield, Brain, Sparkles, GraduationCap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-blue-500 selection:text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800 backdrop-blur-md bg-gray-900/60 fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">EduGuard</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="text-gray-400 hover:text-white transition font-medium">Log in</Link>
            <Link href="/signup" className="bg-white text-black px-5 py-2.5 rounded-full font-bold hover:bg-gray-200 transition transform hover:scale-105 shadow-xl shadow-white/10">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>The Future of Safe Learning</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">
              Your Child's <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-gradient-x">Personal AI Tutor</span>
            </h1>

            <p className="text-xl text-gray-400 max-w-lg leading-relaxed">
              EduGuard provides a safe, distraction-free environment where kids learn with an AI that sticks to the syllabus. No games, no nonsense—just pure education.
            </p>

            <div className="flex items-center gap-4">
              <Link href="/login">
                <button className="group bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-blue-500/25 flex items-center gap-2">
                  Start Learning Now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <button className="px-8 py-4 rounded-full font-bold text-gray-400 hover:text-white border border-gray-800 hover:border-gray-600 transition-all">
                See How It Works
              </button>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="flex-1 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full blur-[100px] opacity-20 animate-pulse"></div>
            <div className="relative bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-500">
              <div className="flex items-center gap-4 mb-6 border-b border-gray-800 pb-4">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div className="bg-gray-800 px-4 py-1 rounded-full text-xs text-gray-400 mx-auto">EduGuard AI Chat</div>
              </div>

              <div className="space-y-4 font-mono text-sm">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex-shrink-0 flex items-center justify-center text-xs font-bold">K</div>
                  <div className="bg-gray-800 p-3 rounded-2xl rounded-tl-none text-gray-300">
                    Can you explain Quantum Physics like I'm 5?
                  </div>
                </div>
                <div className="flex gap-4 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center"><Brain className="w-4 h-4 text-white" /></div>
                  <div className="bg-blue-600/20 border border-blue-500/30 p-3 rounded-2xl rounded-tr-none text-blue-100">
                    Imagine a coin spinning on a table. Before it stops, it's both heads AND tails at the same time. That's superposition! 🪙✨
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex-shrink-0 flex items-center justify-center text-xs font-bold">K</div>
                  <div className="bg-gray-800 p-3 rounded-2xl rounded-tl-none text-gray-300">
                    Cool! What about Fortnite strategies?
                  </div>
                </div>
                <div className="flex gap-4 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div>
                  <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-2xl rounded-tr-none text-red-200">
                    Let's stay focused on learning! We can talk more about physics or math. 📚
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="py-20 bg-gray-900/50 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16">Why Parents Trust <span className="text-blue-400">EduGuard</span></h2>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Shield className="w-6 h-6 text-green-400" />}
              title="Total Safety"
              desc="Our AI Guardrails block inappropriate content and distractions instantly."
            />
            <FeatureCard
              icon={<Brain className="w-6 h-6 text-purple-400" />}
              title="Smart Context"
              desc="AI remembers previous chats and uploaded files for personalized learning."
            />
            <FeatureCard
              icon={<GraduationCap className="w-6 h-6 text-yellow-400" />}
              title="Progress Tracking"
              desc="Detailed dashboards show mastery levels and generate practice tests."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 hover:bg-gray-800 transition-all group">
      <div className="w-12 h-12 rounded-lg bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center mb-4 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-400 leading-relaxed">
        {desc}
      </p>
    </div>
  );
}
