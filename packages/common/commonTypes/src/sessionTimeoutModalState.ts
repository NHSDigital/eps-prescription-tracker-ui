export type SessionTimeoutModal = {
    showModal: boolean
    timeLeft: number
    sessionEndTime: number | null
    buttonDisabled: boolean
    action: "extending" | "loggingOut" | undefined
}
