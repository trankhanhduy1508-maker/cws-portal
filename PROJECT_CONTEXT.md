# Computer Workspace (CWS)

## Vision

Distributed rendering platform.

Customer uploads project.

Worker renders.

Customer downloads result.

---

## Stack

Frontend
React

Backend
NestJS

Database
Supabase

Storage
Backblaze B2

Hosting
Vercel

Production URL
https://cws-portal.vercel.app/ (Owner-confirmed 2026-08-01)

Worker
Python

---

## MVP Workflow

Google Login

↓

Upload

↓

Store in B2

↓

Queue

↓

Worker Render

↓

Preview

↓

Bank QR Payment

↓

Unlock Download

---

## Worker

Heartbeat

Auto Update

Claim Job

Download

Render

Upload

Cleanup

---

## Payment

Bank QR

Unique Job Code

Payment Verification

Unlock Download

---

## Current Priority

1 Worker

2 Google Login

3 Payment

4 Customer MVP
