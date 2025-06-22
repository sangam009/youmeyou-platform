'use client';

import React, { useState } from 'react';
import CodalooLogo from './CodalooLogo';
import { motion, AnimatePresence } from 'framer-motion';

interface Step {
  title: string;
  description: string;
  image?: string;
}

const steps: Step[] = [
  {
    title: 'Welcome to Codaloo',
    description: 'Design, build, and deploy systems with AI. Let's get you started!',
  },
  {
    title: 'Design Your Architecture',
    description: 'Visually create and manage your system architecture with powerful tools.',
  },
  {
    title: 'Generate Code',
    description: 'Let Codaloo generate production-ready code for your architecture.',
  },
  {
    title: 'Deploy & Test',
    description: 'Deploy your system and test it seamlessly from the Codaloo dashboard.',
  },
];

export default function OnboardingWalkthrough() {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(true);

  const nextStep = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));
  const close = () => setOpen(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <AnimatePresence>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center"
        >
          <CodalooLogo size={48} />
          <div className="w-full flex justify-between items-center mt-6 mb-2">
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-6 rounded-full transition-all duration-200 ${i <= step ? 'bg-gradient-to-r from-green-300 via-blue-400 to-purple-400' : 'bg-gray-200'}`}
                />
              ))}
            </div>
            <button onClick={close} className="text-gray-400 hover:text-gray-700 text-xl font-bold">×</button>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mt-2">{steps[step].title}</h2>
          <p className="text-gray-600 text-center mt-2 mb-6">{steps[step].description}</p>
          <div className="flex w-full justify-between mt-4">
            <button
              onClick={prevStep}
              disabled={step === 0}
              className="px-4 py-2 rounded-md bg-gray-100 text-gray-600 font-medium disabled:opacity-50"
            >
              Back
            </button>
            {step < steps.length - 1 ? (
              <button
                onClick={nextStep}
                className="px-4 py-2 rounded-md bg-gradient-to-r from-green-300 via-blue-400 to-purple-400 text-white font-bold shadow-md hover:brightness-110 transition"
              >
                Next
              </button>
            ) : (
              <button
                onClick={close}
                className="px-4 py-2 rounded-md bg-black text-white font-bold shadow-md hover:bg-gray-900 transition"
              >
                Finish
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
} 