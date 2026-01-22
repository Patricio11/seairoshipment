'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei'
import { Suspense } from 'react'
import { motion } from 'framer-motion'

function ReeferContainer() {
    return (
        <group>
            {/* Main Container Body */}
            <mesh position={[0, 0, 0]} castShadow receiveShadow>
                <boxGeometry args={[4, 2, 8]} />
                <meshStandardMaterial
                    color="#1e3a5f"
                    metalness={0.9}
                    roughness={0.2}
                />
            </mesh>

            {/* Cooling Unit */}
            <mesh position={[0, 1.2, -4.2]} castShadow>
                <boxGeometry args={[3.8, 0.8, 0.8]} />
                <meshStandardMaterial
                    color="#0ea5e9"
                    metalness={0.8}
                    roughness={0.3}
                    emissive="#0284c7"
                    emissiveIntensity={0.2}
                />
            </mesh>

            {/* Door Details */}
            <mesh position={[0, 0, 4.05]}>
                <boxGeometry args={[3.6, 1.8, 0.1]} />
                <meshStandardMaterial
                    color="#334155"
                    metalness={0.7}
                    roughness={0.4}
                />
            </mesh>

            {/* "REEFER" Label */}
            <mesh position={[0, 0.5, 4.1]}>
                <boxGeometry args={[2, 0.3, 0.02]} />
                <meshStandardMaterial
                    color="#f59e0b"
                    emissive="#f59e0b"
                    emissiveIntensity={0.5}
                />
            </mesh>
        </group>
    )
}

function Ocean() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial
                color="#0c4a6e"
                metalness={0.3}
                roughness={0.8}
            />
        </mesh>
    )
}

export function Hero3D() {
    return (
        <div className="relative h-screen w-full">
            {/* 3D Canvas */}
            <div className="absolute inset-0">
                <Canvas shadows>
                    <Suspense fallback={null}>
                        {/* Camera */}
                        <PerspectiveCamera makeDefault position={[8, 4, 12]} />

                        {/* Lights */}
                        <ambientLight intensity={0.3} />
                        <directionalLight
                            position={[10, 10, 5]}
                            intensity={1.5}
                            castShadow
                            shadow-mapSize-width={2048}
                            shadow-mapSize-height={2048}
                        />
                        <pointLight position={[-10, 5, -10]} intensity={0.5} color="#0ea5e9" />

                        {/* Environment */}
                        <Environment preset="sunset" />

                        {/* Objects */}
                        <Ocean />
                        <ReeferContainer />

                        {/* Controls */}
                        <OrbitControls
                            enableZoom={false}
                            autoRotate
                            autoRotateSpeed={0.5}
                            maxPolarAngle={Math.PI / 2}
                            minPolarAngle={Math.PI / 4}
                        />
                    </Suspense>
                </Canvas>
            </div>

            {/* Overlay Content */}
            <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <h1 className="font-display text-7xl font-bold tracking-tight text-white lg:text-8xl">
                        The Digital Twin
                        <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            of Cold Chain
                        </span>
                    </h1>

                    <p className="mx-auto mt-6 max-w-2xl text-xl text-slate-300 lg:text-2xl">
                        Enterprise Logistics Operating System for Premium LCL Consolidation & IoT-Enabled Temperature Control
                    </p>

                    <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-4 font-display text-lg font-semibold text-white shadow-2xl shadow-blue-500/50 transition-all hover:shadow-blue-500/75"
                        >
                            <span className="relative z-10">Get Started</span>
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-cyan-600 to-blue-600 transition-transform duration-300 group-hover:translate-x-0" />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="rounded-2xl border-2 border-white/20 bg-white/10 px-8 py-4 font-display text-lg font-semibold text-white backdrop-blur-xl transition-all hover:border-white/40 hover:bg-white/20"
                        >
                            Learn More
                        </motion.button>
                    </div>
                </motion.div>
            </div>

            {/* Glassmorphic Gradient Overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/50 to-slate-950/90" />
        </div>
    )
}
