'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Float } from '@react-three/drei'
import { Suspense, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import * as THREE from 'three'
import { Ship, Thermometer, MapPin, ArrowRight } from 'lucide-react'
import { AuthPanel } from '../auth-panel'

// 3D Reefer Container Component
function ReeferContainer3D() {
    const meshRef = useRef<THREE.Group>(null)

    return (
        <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
            <group ref={meshRef} rotation={[0, Math.PI / 6, 0]}>
                {/* Main Container Body */}
                <mesh position={[0, 0, 0]} castShadow>
                    <boxGeometry args={[6, 2.6, 12]} />
                    <meshStandardMaterial
                        color="#1e40af"
                        metalness={0.8}
                        roughness={0.3}
                    />
                </mesh>

                {/* Cooling Unit - Front */}
                <mesh position={[0, 1.5, -6.2]} castShadow>
                    <boxGeometry args={[5.8, 0.8, 0.8]} />
                    <meshStandardMaterial
                        color="#0ea5e9"
                        metalness={0.9}
                        roughness={0.2}
                        emissive="#0284c7"
                        emissiveIntensity={0.4}
                    />
                </mesh>

                {/* Temperature Display Panel */}
                <mesh position={[0, 0.5, -6.45]}>
                    <boxGeometry args={[2, 0.8, 0.1]} />
                    <meshStandardMaterial
                        color="#000000"
                        emissive="#00ff00"
                        emissiveIntensity={0.3}
                    />
                </mesh>

                {/* Door - Back */}
                <mesh position={[0, 0, 6.05]}>
                    <boxGeometry args={[5.6, 2.4, 0.1]} />
                    <meshStandardMaterial
                        color="#334155"
                        metalness={0.6}
                        roughness={0.5}
                    />
                </mesh>

                {/* "REEFER" Label */}
                <mesh position={[0, 0.8, 6.1]}>
                    <boxGeometry args={[3, 0.4, 0.05]} />
                    <meshStandardMaterial
                        color="#f59e0b"
                        emissive="#f59e0b"
                        emissiveIntensity={0.6}
                    />
                </mesh>

                {/* Temperature Warning Stripe */}
                <mesh position={[0, -1.25, 0]}>
                    <boxGeometry args={[6.1, 0.2, 12.1]} />
                    <meshStandardMaterial
                        color="#ef4444"
                        metalness={0.7}
                    />
                </mesh>
            </group>
        </Float>
    )
}

// Pre-generated mist positions to avoid impure Math.random() calls in render
const MIST_POSITIONS = [
    { x: -7.2, y: -2.1, z: 8.4, size: 1.3 },
    { x: 4.5, y: -1.8, z: -6.2, size: 1.7 },
    { x: -2.8, y: -2.5, z: 3.1, size: 1.1 },
    { x: 9.1, y: -1.4, z: -1.9, size: 1.9 },
    { x: -5.6, y: -2.8, z: -7.8, size: 1.4 },
    { x: 1.3, y: -1.6, z: 6.7, size: 1.6 },
    { x: -8.9, y: -2.3, z: -3.4, size: 1.2 },
    { x: 6.4, y: -1.9, z: 2.5, size: 1.8 },
]

// Cold vapor/mist effect
function ColdMist() {
    return (
        <>
            {MIST_POSITIONS.map((pos, i) => (
                <Float key={i} speed={2 + i * 0.3} rotationIntensity={0.2} floatIntensity={1}>
                    <mesh position={[pos.x, pos.y, pos.z]}>
                        <sphereGeometry args={[pos.size, 16, 16]} />
                        <meshStandardMaterial
                            color="#e0f2fe"
                            transparent
                            opacity={0.15}
                            roughness={1}
                        />
                    </mesh>
                </Float>
            ))}
        </>
    )
}

export function IndustryHero() {
    const [hoveredStat, setHoveredStat] = useState<number | null>(null)
    const [isAuthOpen, setIsAuthOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start start', 'end start']
    })

    const y = useTransform(scrollYProgress, [0, 1], [0, 200])
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

    const stats = [
        { icon: Ship, value: '-18°C', label: 'Temperature Controlled', color: 'from-blue-500 to-cyan-500' },
        { icon: Thermometer, value: '100%', label: 'TIVE IoT Monitored', color: 'from-cyan-500 to-teal-500' },
        { icon: MapPin, value: '200+', label: 'Global Destinations', color: 'from-teal-500 to-emerald-500' },
    ]

    return (
        <>
            <section ref={ref} className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 pt-20">
                {/* Animated Grid Background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e3a8a_1px,transparent_1px),linear-gradient(to_bottom,#1e3a8a_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20" />

                {/* 3D Container Scene */}
                <div className="absolute inset-0 opacity-60">
                    <Canvas shadows>
                        <Suspense fallback={null}>
                            <PerspectiveCamera makeDefault position={[10, 5, 15]} fov={50} />

                            {/* Lighting */}
                            <ambientLight intensity={0.4} />
                            <directionalLight
                                position={[10, 10, 5]}
                                intensity={1.5}
                                castShadow
                                shadow-mapSize-width={2048}
                                shadow-mapSize-height={2048}
                            />
                            <pointLight position={[-10, 5, -10]} intensity={0.8} color="#0ea5e9" />
                            <pointLight position={[10, 5, 10]} intensity={0.6} color="#06b6d4" />

                            {/* 3D Elements */}
                            <ReeferContainer3D />
                            <ColdMist />

                            {/* Ground Plane */}
                            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
                                <planeGeometry args={[100, 100]} />
                                <meshStandardMaterial
                                    color="#0c4a6e"
                                    metalness={0.5}
                                    roughness={0.8}
                                    opacity={0.5}
                                    transparent
                                />
                            </mesh>

                            <OrbitControls
                                enableZoom={false}
                                enablePan={false}
                                autoRotate
                                autoRotateSpeed={0.8}
                                maxPolarAngle={Math.PI / 2.2}
                                minPolarAngle={Math.PI / 3}
                            />
                        </Suspense>
                    </Canvas>
                </div>

                {/* Content Overlay */}
                <motion.div
                    style={{ y, opacity }}
                    className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-5xl"
                    >
                        {/* Industry Badge Spacer - Preserves layout */}
                        <div className="h-10 mb-6" />

                        {/* Headline */}
                        <h1 className="font-display text-6xl font-bold leading-[1.1] tracking-tight text-white md:text-7xl lg:text-8xl">
                            The Operating System
                            <br />
                            <span className="relative inline-block">
                                {/* Brand Color Gradient */}
                                <span className="bg-gradient-to-r from-brand-blue via-brand-green to-brand-silver bg-clip-text text-transparent">
                                    for Cold Chain
                                </span>
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                    className="absolute -bottom-2 left-0 h-1 w-full origin-left rounded-full bg-gradient-to-r from-brand-blue to-brand-green"
                                />
                            </span>
                        </h1>

                        {/* Subheadline */}
                        <p className="mx-auto mt-8 max-w-3xl text-xl leading-relaxed text-slate-300 lg:text-2xl">
                            <strong className="text-white">SRS consolidation</strong> from Cape Town to the world.{' '}
                            <strong className="text-white">IoT temperature tracking</strong> on every pallet.{' '}
                            <strong className="text-white">Automated compliance</strong> for seafood exports.
                        </p>

                        {/* CTA Button */}
                        <div className="mt-12 flex justify-center">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsAuthOpen(true)}
                                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-brand-blue to-brand-green px-10 py-5 font-display text-lg font-bold text-white shadow-2xl shadow-brand-blue/40"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    Book Your First Shipment
                                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                </span>
                            </motion.button>
                        </div>

                        {/* Stats Cards */}
                        <div className="mt-16 grid gap-6 sm:grid-cols-3">
                            {stats.map((stat, index) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: 0.8 + index * 0.15 }}
                                    onHoverStart={() => setHoveredStat(index)}
                                    onHoverEnd={() => setHoveredStat(null)}
                                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:bg-white/10"
                                >
                                    <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-br ${stat.color} p-3`}>
                                        <stat.icon className="h-6 w-6 text-white" strokeWidth={2.5} />
                                    </div>
                                    <div className={`font-display text-4xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                                        {stat.value}
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-slate-400">{stat.label}</div>

                                    {/* Hover Glow */}
                                    <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-0 blur-2xl transition-opacity duration-500 ${hoveredStat === index ? 'opacity-20' : ''}`} />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>

                {/* Bottom Gradient */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent" />
            </section>

            {/* Auth Panel */}
            <AuthPanel isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} initialMode="signup" />
        </>
    )
}
