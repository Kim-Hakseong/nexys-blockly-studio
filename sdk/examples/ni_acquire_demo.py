"""NI-style acquisition demo (mirrors the NI_DAQ_Station template).

On a real PXIe rig, change init() to:
    nexys.init(target="ni-pxie", backend="nidaqmx", device="PXI1Slot2")
With no hardware it runs on the sim backend and still writes a real .tdms.

    python sdk/examples/ni_acquire_demo.py
"""
import nexys

nexys.init(target="sim", sim_ticks=10)   # swap to target="ni-pxie", backend="nidaqmx"
nexys.tdms_open("ni_acquire.tdms")


def ni_voltage_sample():
    nexys.output.log_tdms("ai0_volts", nexys.channels.ai_read("AI0"))


def ni_voltage_rms():
    nexys.output.log_tdms("ai0_rms", nexys.signal.rms(nexys.channels.ai_read("AI0"), samples=200))


def ni_thermocouple():
    nexys.output.log_tdms("temp_c", nexys.channels.sensor_read("thermocouple", 0))


def ni_ao_voltage(volts):
    nexys.channels.ao_write("AO0", volts)


def ni_do_lines():
    nexys.channels.do_write("DO0", "HIGH")
    nexys.channels.do_write("DO1", "LOW")
    nexys.channels.do_write("DO2", "HIGH")


def ni_di_line():
    if nexys.channels.di_read("DI0"):
        nexys.output.alarm("buzzer", "DI0 asserted")


def loop_0():
    ni_voltage_sample()
    ni_voltage_rms()
    ni_thermocouple()
    ni_ao_voltage(2.5)
    ni_do_lines()
    ni_di_line()


def main():
    nexys.timing.loop_every(500, loop_0)


if __name__ == "__main__":
    main()
