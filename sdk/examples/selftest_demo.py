"""Run the Built-In Test (BIT) self-verification — no hardware required.

    python sdk/examples/selftest_demo.py

Verifies UDP / TCP / Serial loopback link integrity + a channel BIT, then
exits 0 on PASS / 1 on FAIL (suitable for CI or a pre-deploy gate).
"""
import sys

import nexys

nexys.init(target="sim")
report = nexys.selftest.run()
print(report.summary())
sys.exit(0 if report.passed else 1)
