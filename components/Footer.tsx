import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-slate-500 dark:text-slate-400 gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-emerald-600 tracking-wider">YANGYU</span>
                        <span>2025© Yangyu Studio</span>
                    </div>
                    <div>
                        <a 
                            href="mailto:yangyustudio.co@gmail.com"
                            className="hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors"
                        >
                            yangyustudio.co@gmail.com
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;