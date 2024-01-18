import { ActionIcon, Box, Button, Flex, Text, Tooltip, useMantineTheme } from '@mantine/core';
import React, { useEffect, useMemo, useRef, useState } from 'react'
import SetOrder from './SetOrder';
import AppHeader from 'components/AppHeader';
import { IconArrowLeft, IconArrowRight, IconCirclePlus, IconEdit, IconPlus, IconPrinter, IconTrash } from '@tabler/icons';
import { DatePickerInput } from '@mantine/dates';
import { MantineReactTable } from 'mantine-react-table';
import FloatingMenu from 'components/FloatingMenu';
import { openConfirmModal } from '@mantine/modals';
import { showErrorToast, showSuccessToast } from 'utilities/Toast';
import { useReactToPrint } from 'react-to-print';
import { PrintModal } from 'components/PrintModal';
import { useQuery } from 'react-query';
import { api_all_party } from '../Party/party.service';
import { getAlteredSelectionParty } from 'services/helperFunctions';
import { api_all_order, api_delete_order, api_order_by_id } from './order.service';
import { api_all_item } from '../Item/item.service';

const confirm_delete_props = {
    title: "Please confirm delete order",
    children: (
        <Text size="sm">
            Are you sure you want to delete this order ? Everything related to this order will be
            deleted.
        </Text>
    ),
    labels: { confirm: "Delete Order", cancel: "Cancel" },
    onCancel: () => console.log("Cancel"),
    confirmProps: { color: "red" },
};

const Order = () => {
    const theme = useMantineTheme();
    const [isSetOrder, setIsSetOrder] = useState(false);
    const [tableData, setTableData] = useState([]);
    const [menuData, setMenuData] = useState([]);
    const [foot, setFoot] = useState([]);
    const [date, setDate] = useState(new Date());
    const [editingData, setEditingData] = useState(null);
    const [printBodyData, setPrintBodyData] = useState([]);
    const [partyData, setPartyData] = useState([]);
    const [partySender, setPartySender] = useState(null);

    const fetch_party = useQuery("fetch_party", api_all_party, {
        refetchOnWindowFocus: false,
        onSuccess: res => {
            setPartyData(getAlteredSelectionParty(res.data));
            setPartySender(res.data.find((e, i) => e.party_type === "sender")?.name);
        },
    });

    useEffect(() => {
        api_all_order(date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate()).then(
            res => {
                if (res.success) {
                    setTableData(res.data);
                    console.log(res);
                } else {
                    showErrorToast({ title: "Error", message: res.message });
                }
            }
        ).catch(err => {
            console.log(err);
        })
    }, [date])

    const componentRef = useRef();
    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
    });

    useEffect(() => {
        if (printBodyData.length) {
            handlePrint();
        }
    }, [printBodyData])

    const columns = useMemo(
        () => [
            {
                accessorKey: 'id',
                header: 'Id',
                size: "auto"
            },
            {
                accessorKey: 'reciever_name',
                header: 'Name',
                size: "auto"
            },
            {
                accessorKey: 'box',
                header: 'Box',
                size: "auto"
            },
            {
                accessorKey: 'pcs',
                header: 'Pcs',
                size: "auto"
            },
            {
                accessorKey: 'crate',
                header: 'Crate',
                size: "auto"
            },
            {
                accessorKey: 'amount',
                header: 'Amount',
                size: "auto"
            },
            {
                accessorKey: 'date',
                header: 'Date',
                size: "auto"
            },
            {
                header: 'Print',
                size: "auto",
                Cell: ({ cell }) => {
                    return <Box style={{ cursor: "pointer" }} onClick={async () => {
                        console.log(cell.row.original?.id);
                        let itemData = [];

                        await api_all_item().then(
                            res => {
                                if (res.success) {
                                    console.log(res);
                                    itemData = res.data;
                                } else {
                                    showErrorToast({ title: "Error", message: res.message });
                                }
                            }
                        ).catch(err => {
                            console.log(err);
                        })

                        await api_order_by_id(cell.row.original?.id).then(
                            res => {
                                if (res.success) {
                                    console.log(res);
                                    let order = res.data;
                                    let items = order?.order_items;

                                    setMenuData(<Flex direction={"column"} gap={5}>
                                        <Text color='black' fw={500} fz={"lg"}>Party: {order?.reciever_name}</Text>
                                        <Text color='black' fw={500} fz={"lg"}>Date: {order?.date}</Text>
                                    </Flex>
                                    )

                                    let body = [];
                                    items.map((e, i) => {
                                        console.log(itemData, e.item);
                                        let item = itemData.find((v) => v.id === e.item);
                                        console.log(item?.name);
                                        let row = [];
                                        row.push(e.supplier_name);
                                        row.push(item?.name);
                                        row.push(e.box);
                                        row.push(e.pcs);
                                        row.push(e.crate);
                                        row.push(e.amount);
                                        body.push(row);
                                    })
                                    setFoot(["Total", items.length + " items", order?.box, order?.pcs, order?.crate, order?.amount]);
                                    setPrintBodyData(body);
                                } else {
                                    showErrorToast({ title: "Error", message: res.message });
                                }
                            }
                        ).catch(err => {
                            console.log(err);
                        })
                    }}>
                        <IconPrinter color={theme.colors.brand[7]} />
                    </Box>;
                },
            },
        ],
        [],
    );

    const openDeleteConfirmation = id => {
        openConfirmModal({
            ...confirm_delete_props,
            onConfirm: async () => await deleteOrder(id),
        });
    };

    const deleteOrder = async id => {
        await api_delete_order(id).then(
            res => {
                if (res.success) {
                    console.log(res);
                    showSuccessToast({ title: "Success", message: res.message });
                    api_all_order(date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate()).then(
                        res => {
                            if (res.success) {
                                setTableData(res.data);
                                console.log(res);
                            } else {
                                showErrorToast({ title: "Error", message: res.message });
                            }
                        }
                    ).catch(err => {
                        console.log(err);
                    })
                } else {
                    showErrorToast({ title: "Error", message: res.message });
                }
            }
        ).catch(err => {
            console.log(err);
        })
    };

    const getEditOrder = async (id) => {
        await api_order_by_id(id).then(
            res => {
                if (res.success) {
                    console.log(res);
                    setEditingData(res.data);
                    setIsSetOrder(true);
                } else {
                    showErrorToast({ title: "Error", message: res.message });
                }
            }
        ).catch(err => {
            console.log(err);
        })
    }

    return (
        <div>
            {isSetOrder ? <>
                <AppHeader title="ADD ORDER" /><SetOrder setFetchDate={setDate} partyData={partyData} setEditingData={setEditingData} editingData={editingData} setIsSetOrder={setIsSetOrder} /></> :
                <>
                    <AppHeader title="ORDER" />
                    <Box p={5}>
                        <Flex mb={20} align={"flex-end"} gap={10}>
                            <DatePickerInput w={120} label="Select Date" value={date} onChange={setDate} />
                        </Flex>
                        <MantineReactTable
                            columns={columns}
                            data={tableData}
                            positionActionsColumn='last'
                            enableRowActions
                            enableColumnActions={false}
                            renderRowActions={({ row }) => (
                                <Flex>
                                    <Tooltip label="Edit Order">
                                        <ActionIcon
                                            ml={10}
                                            sx={theme => ({ color: theme.colors.brand[7] })}
                                            onClick={() => {
                                                console.log(row.original.id);
                                                getEditOrder(row.original.id);
                                            }}
                                        >
                                            <IconEdit style={{ width: 20 }} />
                                        </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Delete Order">
                                        <ActionIcon
                                            sx={theme => ({ color: theme.colors.red[6] })}
                                            ml={10}
                                            onClick={() => {
                                                openDeleteConfirmation(row.original.id);
                                            }}
                                        >
                                            <IconTrash style={{ width: 20 }} />
                                        </ActionIcon>
                                    </Tooltip>
                                </Flex>
                            )}
                        />
                    </Box>
                    <FloatingMenu
                        m={5}
                        right
                        size={50}
                        onClick={() => {
                            setIsSetOrder(true);
                        }}
                    >
                        <IconPlus color="white" />
                    </FloatingMenu>
                </>
            }
            <div style={{ display: "none" }}>
                <PrintModal
                    title={partySender}
                    head={["Supplier", "Item", "Box", "Pcs", "crate", "Amount"]}
                    body={printBodyData}
                    ref={componentRef}
                    children={menuData}
                    foot={foot}
                />
            </div>

        </div>
    )
}

export default Order