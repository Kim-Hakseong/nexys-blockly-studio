"""Hand-written equivalent of the Studio's BIT_Sequence demo.

Run it with no hardware:  python sdk/examples/bit_demo.py
It prints a live BIT sequence and writes a real bit_demo.tdms file.
"""
import nexys

nexys.init(target="sim", sim_ticks=8)
nexys.tdms_open("bit_demo.tdms")


def loop_0():
    nexys.channels.do_write("DO0", "HIGH")     # stimulus pulse
    nexys.timing.delay_ms(10)
    response = nexys.channels.ai_read("AI0")    # measure response
    nexys.channels.do_write("DO0", "LOW")
    if nexys.signal.in_range(response, 1.5, 3.5):
        nexys.output.bit_result("PASS", value=response)
    else:
        nexys.output.bit_result("FAIL", value=response)
    nexys.output.log_tdms("bit_ai0", response)


def main():
    nexys.timing.loop_every(50, loop_0)


if __name__ == "__main__":
    main()
