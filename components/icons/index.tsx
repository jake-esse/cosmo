import React from 'react'

interface IconProps {
  className?: string
  strokeWidth?: number
}

export function VineIcon({ className = "w-10 h-9" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 39 37" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.375 30.8333H27.625" stroke="currentColor" strokeWidth="2.3"/>
      <path d="M16.25 30.8333C25.1875 26.9792 17.55 20.9667 21.125 15.4167" stroke="currentColor" strokeWidth="2"/>
      <path d="M15.4375 14.4917C17.225 15.725 18.3625 17.8833 19.175 20.1958C15.925 20.8125 13.4875 20.8125 11.375 19.7333C9.425 18.8083 7.6375 16.8042 6.5 13.2583C11.05 12.4875 13.65 13.2583 15.4375 14.4917Z" stroke="currentColor" strokeWidth="2"/>
      <path d="M22.9125 9.25C21.6736 11.087 21.0504 13.237 21.125 15.4167C24.2125 15.2625 26.4875 14.4917 28.1125 13.2583C29.7375 11.7167 30.7125 9.7125 30.875 6.16667C26.4875 6.32083 24.375 7.70833 22.9125 9.25Z" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}

export function PlusIcon({ className = "w-5 h-5", strokeWidth = 1.33333 }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 5V15" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d="M5 10H15" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

export function AppsIcon({ className = "w-5 h-5", strokeWidth = 2 }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.5 2.25H2.25V7.5H7.5V2.25Z" stroke="currentColor" strokeWidth={strokeWidth}/>
      <path d="M15.75 2.25H10.5V7.5H15.75V2.25Z" stroke="currentColor" strokeWidth={strokeWidth}/>
      <path d="M15.75 10.5H10.5V15.75H15.75V10.5Z" stroke="currentColor" strokeWidth={strokeWidth}/>
      <path d="M7.5 10.5H2.25V15.75H7.5V10.5Z" stroke="currentColor" strokeWidth={strokeWidth}/>
    </svg>
  )
}

export function ChatsIcon({ className = "w-5 h-5", strokeWidth = 2 }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.625 9.10417C16.6277 10.1491 16.3836 11.1798 15.9125 12.1125C15.3539 13.2301 14.4952 14.1702 13.4326 14.8274C12.3699 15.4845 11.1453 15.8329 9.89583 15.8333C8.85094 15.8361 7.82017 15.5919 6.8875 15.1208L2.375 16.625L3.87917 12.1125C3.40807 11.1798 3.16394 10.1491 3.16667 9.10417C3.16715 7.85473 3.51548 6.6301 4.17265 5.56744C4.82982 4.50479 5.76987 3.64608 6.8875 3.08751C7.82017 2.61641 8.85094 2.37228 9.89583 2.37501H10.2917C11.9418 2.46604 13.5003 3.16253 14.6689 4.3311C15.8375 5.49968 16.534 7.05823 16.625 8.70834V9.10417Z" stroke="currentColor" strokeWidth={strokeWidth}/>
    </svg>
  )
}

export function SharesIcon({ className = "w-5 h-5", strokeWidth = 2 }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.0417 3.95833C13.8542 3.95833 12.825 5.06666 12.6667 5.54166C9.89583 4.35416 3.95833 5.30416 3.95833 9.5C3.95833 10.925 3.95833 11.875 5.54167 13.0625V15.8333H8.70833V14.25H11.0833V15.8333H14.25V12.6667C15.0417 12.2708 15.5958 11.875 15.8333 11.0833H17.4167V7.91666H15.8333C15.8333 7.12499 15.4375 6.72916 15.0417 6.33333V3.95833Z" stroke="currentColor" strokeWidth={strokeWidth}/>
      <path d="M1.58333 7.125V7.91667C1.58333 8.7875 2.29583 9.5 3.16667 9.5H3.95833" stroke="currentColor" strokeWidth={strokeWidth}/>
    </svg>
  )
}

export function DataIcon({ className = "w-5 h-5", strokeWidth = 2 }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.16667 15.8333H15.8333C16.2533 15.8333 16.656 15.6665 16.9529 15.3696C17.2499 15.0727 17.4167 14.6699 17.4167 14.25V6.33333C17.4167 5.91341 17.2499 5.51068 16.9529 5.21375C16.656 4.91681 16.2533 4.75 15.8333 4.75H9.55542C9.29463 4.74865 9.03822 4.68291 8.80895 4.55861C8.57969 4.43431 8.38468 4.2553 8.24125 4.0375L7.59208 3.0875C7.44865 2.8697 7.25364 2.69069 7.02438 2.56639C6.79512 2.44209 6.5387 2.37635 6.27792 2.375H3.16667C2.74674 2.375 2.34401 2.54181 2.04708 2.83875C1.75015 3.13568 1.58333 3.53841 1.58333 3.95833V14.25C1.58333 15.1208 2.29583 15.8333 3.16667 15.8333Z" stroke="currentColor" strokeWidth={strokeWidth}/>
    </svg>
  )
}

export function ChevronDownIcon({ className = "w-4 h-4", strokeWidth = 1.33333 }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.00205 5.99591L7.99795 10L12.002 6.00409" stroke="currentColor" strokeWidth={strokeWidth}/>
    </svg>
  )
}

export function SendIcon({ className = "w-6 h-6", strokeWidth = 2 }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 25V11" stroke="currentColor" strokeWidth={strokeWidth}/>
      <path d="M11 18L18 11L25 18" stroke="currentColor" strokeWidth={strokeWidth}/>
    </svg>
  )
}

export function ChevronLeftIcon({ className = "w-4 h-4", strokeWidth = 1.33333 }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.004 12.004L6 8.00005L9.99591 3.99601" stroke="currentColor" strokeWidth={strokeWidth}/>
    </svg>
  )
}

export function ChevronRightIcon({ className = "w-4 h-4", strokeWidth = 1.33333 }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.99595 3.99595L10 7.99995L6.00409 12.004" stroke="currentColor" strokeWidth={strokeWidth}/>
    </svg>
  )
}
