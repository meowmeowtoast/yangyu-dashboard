import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="border-t border-zinc-200 dark:border-zinc-800">
            <div className="max-w-[1200px] mx-auto w-full py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-emerald-600 tracking-wider">YANGYU</span>
                        <span>2025© Yangyu Studio</span>
                    </div>
                    <a
                        href="mailto:yangyustudio.co@gmail.com"
                        className="hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors break-all"
                    >
                        yangyustudio.co@gmail.com
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;