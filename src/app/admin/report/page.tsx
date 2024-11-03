"use client";

import React, { useState } from 'react';;
import VanDriverOperatorsReportPage from './vanreport';
import TerminalsReportPage from './terminalreport';

const Page = () => {
    const [isVan, setIsVan] = useState(true);

    const toggleComponent = () => {
        setIsVan(!isVan);
    };

    return (
        <div>
            <button onClick={toggleComponent}  className='ml-96'>
                {isVan ? 'Switch to Terminal Report' : 'Switch to Van Driver Report'}
            </button>
            {isVan ? <VanDriverOperatorsReportPage /> : <TerminalsReportPage />}
        </div>
    );
};

export default Page;