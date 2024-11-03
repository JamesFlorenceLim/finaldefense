"use client";

import React, { useState } from 'react';
import Gensan from './Gensan';
import Palimbang from './Palimbang';

const Page = () => {
    const [isGensan, setIsGensan] = useState(true);

    return (
        <div>
            <div className="flex items-center ml-[80rem] relative top-32 text-white">
                <span className="mr-2 ">Gensan</span>
                <label className="relative inline-flex items-center cursor-pointer ">
                    <input 
                        type="checkbox" 
                        className="sr-only peer " 
                        checked={!isGensan} 
                        onChange={() => setIsGensan(!isGensan)} 
                    />
                    <div className="w-11 h-6 bg-white rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-blue-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all "></div>
                </label>
                <span className="ml-2">Palimbang</span>
            </div>
            {isGensan ? <Gensan /> : <Palimbang />}
        </div>
    );
};

export default Page;