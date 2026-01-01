import React, { createContext, useContext, useState } from 'react';

type UIContextType = {
    isLogModalVisible: boolean;
    openLogModal: () => void;
    closeLogModal: () => void;
};

const UIContext = createContext<UIContextType>({
    isLogModalVisible: false,
    openLogModal: () => { },
    closeLogModal: () => { },
});

export const UIProvider = ({ children }: { children: React.ReactNode }) => {
    const [isLogModalVisible, setIsLogModalVisible] = useState(false);

    const openLogModal = () => setIsLogModalVisible(true);
    const closeLogModal = () => setIsLogModalVisible(false);

    return (
        <UIContext.Provider value={{ isLogModalVisible, openLogModal, closeLogModal }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => useContext(UIContext);
