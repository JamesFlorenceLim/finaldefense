"use client";

import React, { useState } from 'react';
import Gensan from './Gensan';
import Palimbang from './Palimbang';

const Page = () => {
    const [isGensan, setIsGensan] = useState(true);

    const toggleComponent = () => {
        setIsGensan(!isGensan);
    };

    return (
        <div>
            <button onClick={toggleComponent}>
                {isGensan ? 'Switch to Palimbang' : 'Switch to Gensan'}
            </button>
            {isGensan ? <Gensan /> : <Palimbang />}
        </div>
    );
};

export default Page;