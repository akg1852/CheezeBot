#!/bin/bash

forever start --minUptime 1000 --spinSleepTime 10000 index.js

less +F "`forever logs --plain | tail -1 | awk '{print $NF}'`"