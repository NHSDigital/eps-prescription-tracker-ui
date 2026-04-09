export type SessionTimeoutModal = {
    showModal: boolean
    sessionEndTime: number | null
    buttonDisabled: boolean
    action: "extending" | "loggingOut" | undefined
}
