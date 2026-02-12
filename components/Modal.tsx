'use client';

interface ModalI {
    isOpen: boolean,
    children: React.ReactNode
}

export default function Modal({ isOpen, children }: ModalI) {
    return (
        <>
            {isOpen && <div className="fixed left-0 right-0 bottom-0 top-[73px] bg-black bg-opacity-50 z-[90] flex items-center justify-center p-4">
                {children}
            </div>}
        </>
    );
}

