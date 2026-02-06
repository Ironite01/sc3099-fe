'use client';

interface ModalI {
    isOpen: boolean,
    children: React.ReactNode
}

export default function Modal({ isOpen, children }: ModalI) {
    return (
        <>
            {isOpen && <div className="fixed w-screen h-screen bottom-0 top-0 left-0 right-0 bg-black bg-opacity-25 z-[calc(var(--index)+1)] flex items-center justify-center">
                <div className="bg-slate-600 p-3 rounded-md min-w-80 border border-slate-500">
                    {children}
                </div>
            </div>}
        </>
    );
}