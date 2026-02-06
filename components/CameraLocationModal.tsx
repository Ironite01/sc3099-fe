'use client';

import Modal from "./Modal";
import Image from "next/image";

export enum PermissionsType {
    Camera = 'CAMERA',
    Geolocation = 'GEOLOCATION'
}

interface CameraLocationModalI {
    isOpen: boolean,
    setIsOpen: (isOpen: boolean) => void,
    type: PermissionsType
}

export default function CameraLocationModal({ type, isOpen, setIsOpen }: CameraLocationModalI) {
    async function setPermission(type: PermissionsType) {
        // TODO: Update permissions accordingly
        try {
            const response = await fetch("");
            if (!response.ok) {
                throw new Error("Something went wrong!");
            }
            setIsOpen(false);
        } catch (e: any) {
            // TODO: Replace this with Error Modal
            window.alert(e.message);
        }
    }

    return (
        <Modal isOpen={isOpen}>
            <div className="relative">
                <div className="flex gap-4 items-center">
                    <Image className="invert" src={type === PermissionsType.Camera ? "camera.svg" : "pin.svg"} width={50} height={50} alt="icon" />
                    <p className="text-xl">Allow <b>{type === PermissionsType.Camera ? "Camera" : "Geolocation"}</b> permissions?</p>
                </div>
                <div className="pt-4 flex m-auto gap-4 justify-end">
                    <button onClick={() => setIsOpen(false)}>Deny</button>
                    <button onClick={() => setPermission(type)}>Allow</button>
                </div>
            </div>
        </Modal>
    )
}