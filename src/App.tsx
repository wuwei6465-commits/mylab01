/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Wind, 
  Droplets, 
  Settings2, 
  X,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Layers,
  Zap,
  Waves
} from 'lucide-react';
import { cn } from './lib/utils';

// --- Types ---
interface Stream {
  id: string;
  path: string;
  depth: number;
  opacity: number;
  width: number;
  endX: number;
  endY: number;
}

// --- Constants ---
const ABSOLUTE_MAX_DEPTH = 7; 

export default function App() {
  // --- State ---
  const [rr, setRr] = useState<number>(0.10); // 法定准备金率
  const [c, setC] = useState<number>(0.05);   // 现金比率
  const [maxDepth, setMaxDepth] = useState<number>(6); 
  const [currentVisibleDepth, setCurrentVisibleDepth] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Calculations ---
  const k = (1 - rr) / (1 + c);
  const multiplier = (1 + c) / (rr + c);

  // 递归生成“水流”分形数据
  const allStreams = useMemo(() => {
    const streams: Stream[] = [];
    let idCounter = 0;
    
    const generate = (
      x1: number, 
      y1: number, 
      angle: number, 
      length: number, 
      depth: number
    ) => {
      if (depth > ABSOLUTE_MAX_DEPTH || length < 2) return;

      // 计算终点，加入一点流水的随机摆动
      const x2 = x1 + length * Math.cos(angle);
      const y2 = y1 + length * Math.sin(angle);
      
      // 使用贝塞尔曲线模拟水的流动感
      const cp1x = x1 + (length * 0.5) * Math.cos(angle - 0.2);
      const cp1y = y1 + (length * 0.5) * Math.sin(angle - 0.2);
      const path = `M ${x1} ${y1} Q ${cp1x} ${cp1y} ${x2} ${y2}`;

      const opacity = Math.pow(k, depth) * 0.85;
      const width = Math.max(0.2, 12 * Math.pow(0.55, depth));

      streams.push({ 
        id: `s-${depth}-${idCounter++}`,
        path, depth, opacity, width, endX: x2, endY: y2 
      });

      // 越往下分叉越多，体现“受众面越广”
      // 第一层1个，第二层2个，之后每层分叉数随深度增加
      const numForks = depth < 2 ? 2 : (depth < 4 ? 3 : 4);
      const spread = (Math.PI / 1.5) * (0.6 + k * 0.4); 
      
      const nextLength = length * (0.4 + k * 0.45); 

      for (let i = 0; i < numForks; i++) {
        const nextAngle = angle - spread / 2 + (spread / (numForks - 1)) * i;
        // 模拟水流向下的重力感，角度向正下方(PI/2)偏移
        const gravityInfluence = 0.15;
        const targetAngle = Math.PI / 2;
        const adjustedAngle = nextAngle * (1 - gravityInfluence) + targetAngle * gravityInfluence;
        
        generate(x2, y2, adjustedAngle + (Math.random() - 0.5) * 0.1, nextLength, depth + 1);
      }
    };

    // 从顶部“源头”开始
    generate(0, -300, Math.PI / 2, 180, 0);
    return streams;
  }, [k]);

  const streamsByDepth = useMemo(() => {
    const groups: Stream[][] = Array.from({ length: ABSOLUTE_MAX_DEPTH + 1 }, () => []);
    allStreams.forEach(s => {
      if (s.depth <= ABSOLUTE_MAX_DEPTH) {
        groups[s.depth].push(s);
      }
    });
    return groups;
  }, [allStreams]);

  // --- Playback Logic ---
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentVisibleDepth(prev => {
          if (prev >= maxDepth) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1200); 
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, maxDepth]);

  const handleTogglePlay = () => {
    if (currentVisibleDepth >= maxDepth) {
      setCurrentVisibleDepth(0);
    }
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    if (nextPlaying) setShowControls(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentVisibleDepth(0);
  };

  return (
    <div className="min-h-screen bg-[#010409] text-slate-200 font-sans overflow-hidden relative flex flex-col items-center justify-center">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-blue-500/5 rounded-full blur-[180px]" />
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03]" 
             style={{ backgroundImage: 'linear-gradient(rgba(251, 191, 36, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(251, 191, 36, 0.1) 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
      </div>

      {/* Main Visual Stage */}
      <div className="relative w-full h-[85vh] flex items-center justify-center">
        <svg 
          viewBox="-500 -400 1000 800" 
          className="w-full h-full drop-shadow-[0_0_60px_rgba(59,130,246,0.1)]"
        >
          {/* 渲染所有已生长的层级 */}
          {streamsByDepth.slice(0, currentVisibleDepth + 1).map((group, d) => (
            <g key={`depth-group-${d}`}>
              {group.map((s) => (
                <React.Fragment key={s.id}>
                  <motion.path
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ 
                      pathLength: 1, 
                      opacity: s.opacity,
                      stroke: d % 2 === 0 ? "#fbbf24" : "#fcd34d" 
                    }}
                    transition={{ 
                      duration: 2, 
                      ease: "easeInOut"
                    }}
                    d={s.path}
                    fill="none"
                    strokeWidth={s.width}
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]"
                  />
                  {/* 每一层末梢的“水滴”或“恩泽” */}
                  {s.depth === currentVisibleDepth && (
                    <motion.circle
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: [0, s.opacity, 0], scale: [0.5, 1.5, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      cx={s.endX} cy={s.endY}
                      r={s.width * 2.5}
                      fill="#fbbf24"
                      className="blur-[2px]"
                    />
                  )}
                </React.Fragment>
              ))}
            </g>
          ))}
          
          {/* The Source (Central Bank) - 泉眼 */}
          <g transform="translate(0, -300)">
            <motion.circle
              initial={{ r: 0 }}
              animate={{ r: 25 }}
              fill="url(#sourceGradient)"
              className="shadow-[0_0_50px_rgba(251,191,36,0.6)]"
            />
            <defs>
              <radialGradient id="sourceGradient">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </radialGradient>
            </defs>
            <motion.circle
              animate={{ r: [25, 70, 25], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 5, repeat: Infinity }}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="0.5"
            />
          </g>
        </svg>

        {/* Poetic Labels */}
        <div className="absolute top-16 left-16 space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="p-3 bg-amber-500/10 rounded-2xl backdrop-blur-xl border border-amber-500/20">
              <Waves className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-5xl font-extralight tracking-[0.6em] text-amber-400 uppercase">上善若水</h1>
              <p className="text-[10px] tracking-[0.4em] text-amber-500/40 font-serif italic mt-1">The Descending Grace of Liquidity</p>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            className="flex items-center gap-3 text-[9px] tracking-[0.3em] uppercase"
          >
            <span className="text-amber-500">Flow Round {currentVisibleDepth}</span>
            <div className="h-[1px] w-24 bg-gradient-to-r from-amber-500/50 to-transparent" />
          </motion.div>
        </div>

        {/* Multiplier Display */}
        <div className="absolute bottom-20 right-20 text-right">
          <motion.div
            key={multiplier}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <p className="text-[11px] uppercase tracking-[0.6em] text-amber-500/40 font-bold">总额扩张倍数</p>
            <div className="flex items-baseline justify-end gap-3">
              <p className="text-9xl font-thin text-amber-400 font-serif tabular-nums leading-none tracking-tighter">
                {multiplier.toFixed(2)}
              </p>
              <span className="text-4xl font-light text-amber-500/20">×</span>
            </div>
          </motion.div>
        </div>

        {/* Flow Progress Bar */}
        <div className="absolute bottom-40 left-16 w-64 space-y-3">
          <div className="flex justify-between text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold">
            <span>渗透进度</span>
            <span className="text-amber-500/60">{Math.round((currentVisibleDepth / maxDepth) * 100)}%</span>
          </div>
          <div className="h-[1px] w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
              animate={{ width: `${(currentVisibleDepth / maxDepth) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Playback Controls Bar */}
      <div className="fixed bottom-12 flex items-center gap-10 px-12 py-6 bg-slate-950/60 backdrop-blur-3xl rounded-full border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)] z-50">
        <button 
          onClick={handleReset}
          className="p-2 text-slate-600 hover:text-amber-400 transition-all hover:scale-110"
          title="重置源头"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
        
        <button 
          onClick={handleTogglePlay}
          className="w-20 h-20 flex items-center justify-center bg-amber-500 text-slate-950 rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(245,158,11,0.25)]"
        >
          {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
        </button>

        <button 
          onClick={() => setShowControls(!showControls)}
          className={cn(
            "p-2 transition-all duration-700",
            showControls ? "text-amber-400 rotate-180" : "text-slate-600 hover:text-amber-400 hover:scale-110"
          )}
          title="调律"
        >
          <Settings2 className="w-6 h-6" />
        </button>
      </div>

      {/* Zen Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.98 }}
            className="fixed bottom-40 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl bg-slate-950/95 backdrop-blur-3xl rounded-[4rem] p-12 border border-white/5 shadow-[0_40px_120px_rgba(0,0,0,0.9)] z-40"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Droplets className="w-5 h-5 text-blue-400/60" />
                    <span className="text-[11px] font-bold tracking-[0.3em] text-slate-500 uppercase">准备金率</span>
                  </div>
                  <span className="text-amber-400 font-mono text-xs">{(rr * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="0.02" max="0.4" step="0.01"
                  value={rr}
                  onChange={(e) => { setRr(Number(e.target.value)); handleReset(); }}
                  className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wind className="w-5 h-5 text-emerald-400/60" />
                    <span className="text-[11px] font-bold tracking-[0.3em] text-slate-500 uppercase">现金比率</span>
                  </div>
                  <span className="text-amber-400 font-mono text-xs">{(c * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="0" max="0.6" step="0.02"
                  value={c}
                  onChange={(e) => { setC(Number(e.target.value)); handleReset(); }}
                  className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-purple-400/60" />
                    <span className="text-[11px] font-bold tracking-[0.3em] text-slate-500 uppercase">渗透深度</span>
                  </div>
                  <span className="text-amber-400 font-mono text-xs">{maxDepth}</span>
                </div>
                <input 
                  type="range" min="1" max={ABSOLUTE_MAX_DEPTH} step="1"
                  value={maxDepth}
                  onChange={(e) => { setMaxDepth(Number(e.target.value)); handleReset(); }}
                  className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-amber-500"
                />
              </div>

            </div>

            <div className="mt-12 pt-10 border-t border-white/5 flex flex-col items-center gap-6">
              <button 
                onClick={handleTogglePlay}
                className="group relative px-12 py-5 bg-amber-500 text-slate-950 rounded-full font-bold text-sm overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-amber-500/20"
              >
                <span className="relative z-10">确认并开启渗透</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              </button>
              <p className="text-[10px] text-slate-600 tracking-[0.3em] italic uppercase text-center max-w-md leading-loose">
                "上善若水，水善利万物而不争。信用之流，自高而下，润物无声。"
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative Elements */}
      <div className="absolute top-16 right-16 flex gap-10 opacity-10">
        <Sparkles className="w-6 h-6" />
        <Maximize2 className="w-6 h-6" />
      </div>
    </div>
  );
}
