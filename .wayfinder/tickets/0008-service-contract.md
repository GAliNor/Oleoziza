---
id: 8
title: Service contract: mock/API interface, latency, errors, offline queue
label: wayfinder:grilling
status: open
assignee:
blocked-by: [3, 4]
---

## Question

What exactly does a module service look like so switching `VITE_DATA_SOURCE` from mock to api changes nothing else? Decide: interface shape, ids and dates on the wire, pagination/filtering (Season), error model, simulated latency/failures in mock, where the offline queue sits (service vs store), conflict handling on sync, and how mock constants are organised per module.
