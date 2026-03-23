export type SessionTimeoutModal = {
    showModal: boolean
    timeLeft: number
    buttonDisabled: boolean
    action: "extending" | "loggingOut" | undefined
}
